Yes! `tenacity` provides built-in support for implementing a **circuit breaker** using the `retry_if_result` feature. This allows us to stop retrying when a function continuously fails and trigger a cooldown before retrying again.

---

### **Circuit Breaker with `tenacity`**
This implementation combines:
1. **Retry mechanism**: Retries transient failures up to a limit.
2. **Circuit breaker behavior**: Stops attempting after repeated failures and enforces a cooldown.

---

### **Implementation**
```python
import boto3
import aioboto3
import botocore.exceptions
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, after
from config.settings import AWS_REGION, AWS_RETRY_CONFIG, TIMEOUT
from core.logger import logger
import time

# Globals
_session = None
_client = None
_resource = None
_async_session = None

# Circuit breaker state
CIRCUIT_BREAKER_OPEN = False
CIRCUIT_RESET_TIMEOUT = 60  # Cooldown period in seconds
LAST_FAILURE_TIME = None
FAILURE_THRESHOLD = 5  # Number of failures before tripping

def circuit_breaker_callback(retry_state):
    """Triggers circuit breaker when failure threshold is reached."""
    global CIRCUIT_BREAKER_OPEN, LAST_FAILURE_TIME

    if retry_state.attempt_number >= FAILURE_THRESHOLD:
        logger.error("Circuit breaker activated! Temporarily blocking requests.")
        CIRCUIT_BREAKER_OPEN = True
        LAST_FAILURE_TIME = time.time()

def check_circuit_breaker():
    """Checks if the circuit breaker is open and enforces cooldown."""
    global CIRCUIT_BREAKER_OPEN, LAST_FAILURE_TIME

    if CIRCUIT_BREAKER_OPEN:
        if time.time() - LAST_FAILURE_TIME >= CIRCUIT_RESET_TIMEOUT:
            logger.info("Circuit breaker reset! Allowing requests again.")
            CIRCUIT_BREAKER_OPEN = False
        else:
            raise Exception("Circuit breaker is open. Try again later.")

@retry(
    stop=stop_after_attempt(FAILURE_THRESHOLD),
    wait=wait_exponential(multiplier=2, min=1, max=10),
    retry=retry_if_exception_type(botocore.exceptions.ClientError),
    after=circuit_breaker_callback,
    reraise=True
)
def get_session():
    """Create or reuse a synchronous session with retry and circuit breaker."""
    check_circuit_breaker()  # Enforce circuit breaker rule
    global _session
    if not _session:
        _session = boto3.Session(region_name=AWS_REGION)
    return _session

@retry(
    stop=stop_after_attempt(FAILURE_THRESHOLD),
    wait=wait_exponential(multiplier=2, min=1, max=10),
    retry=retry_if_exception_type(botocore.exceptions.ClientError),
    after=circuit_breaker_callback,
    reraise=True
)
def get_client():
    """Create or reuse a synchronous DynamoDB client with retry and circuit breaker."""
    check_circuit_breaker()
    global _client
    if not _client:
        _client = get_session().client(
            "dynamodb",
            config=boto3.session.Config(
                retries=AWS_RETRY_CONFIG,
                connect_timeout=TIMEOUT,
                read_timeout=TIMEOUT
            )
        )
    return _client

@retry(
    stop=stop_after_attempt(FAILURE_THRESHOLD),
    wait=wait_exponential(multiplier=2, min=1, max=10),
    retry=retry_if_exception_type(botocore.exceptions.ClientError),
    after=circuit_breaker_callback,
    reraise=True
)
def get_resource():
    """Create or reuse a synchronous DynamoDB resource with retry and circuit breaker."""
    check_circuit_breaker()
    global _resource
    if not _resource:
        _resource = get_session().resource("dynamodb")
    return _resource
```

---

### **How It Works**
1. **Retry Mechanism**:
   - Retries up to `FAILURE_THRESHOLD` (5 times).
   - Uses **exponential backoff** (`wait_exponential`), meaning wait times increase after each failure.

2. **Circuit Breaker**:
   - If `FAILURE_THRESHOLD` is reached, `circuit_breaker_callback` activates the circuit breaker.
   - `CIRCUIT_BREAKER_OPEN` is set to `True`, and the last failure time is recorded.
   - Future attempts call `check_circuit_breaker()`:
     - If the cooldown (`CIRCUIT_RESET_TIMEOUT = 60s`) is not over, requests are **blocked**.
     - Once the cooldown expires, the circuit resets, allowing new requests.

3. **Logging**:
   - Logs circuit breaker activation and reset events.

---

### **Advantages**
✅ **Uses only `tenacity`** (no extra dependencies).  
✅ **Prevents unnecessary retries** when DynamoDB is down.  
✅ **Handles transient failures** using exponential backoff.  

Would you like an async version as well?