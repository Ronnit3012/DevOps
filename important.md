Here's a complete implementation for a **DynamoDB connector** with the requested features and a clean, modular folder structure.

---

### **Folder Structure**
```
dynamodb_connector/
│
├── __init__.py                  # Makes the folder a package
├── config/
│   ├── __init__.py              # Config package
│   └── settings.py              # Configuration settings
├── core/
│   ├── __init__.py              # Core package
│   ├── session_manager.py       # Session and client management
│   ├── error_handler.py         # Error handling utilities
│   └── logger.py                # Logging setup
├── utils/
│   ├── __init__.py              # Utilities package
│   ├── queries.py               # Parameterized query utilities
│   ├── batch_operations.py      # Batch operation utilities
│   └── transactions.py          # Transaction utilities
└── examples/
    ├── __init__.py              # Example package
    └── demo.py                  # Example usage
```

---

### **Code Implementation**

#### **1. Configuration (`config/settings.py`)**
Define default settings, such as retries, timeouts, and region.

```python
import os

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_RETRY_CONFIG = {
    "max_attempts": 5,  # Retry 5 times
    "mode": "adaptive"  # Dynamically adjusts retry delay
}
TIMEOUT = 10  # Timeout in seconds
```

---

#### **2. Session Management (`core/session_manager.py`)**
Manage sessions and clients.

```python
import boto3
import aioboto3
from config.settings import AWS_REGION, AWS_RETRY_CONFIG, TIMEOUT


class DynamoDBSessionManager:
    def __init__(self):
        self._session = None
        self._client = None
        self._resource = None
        self._async_session = None

    def get_session(self):
        """Create or reuse a synchronous session."""
        if not self._session:
            self._session = boto3.Session(region_name=AWS_REGION)
        return self._session

    def get_client(self):
        """Create or reuse a synchronous DynamoDB client."""
        if not self._client:
            self._client = self.get_session().client(
                "dynamodb",
                config=boto3.session.Config(
                    retries=AWS_RETRY_CONFIG,
                    connect_timeout=TIMEOUT,
                    read_timeout=TIMEOUT
                )
            )
        return self._client

    def get_resource(self):
        """Create or reuse a synchronous DynamoDB resource."""
        if not self._resource:
            self._resource = self.get_session().resource("dynamodb")
        return self._resource

    async def get_async_client(self):
        """Create or reuse an asynchronous DynamoDB client."""
        if not self._async_session:
            self._async_session = aioboto3.Session()
        return self._async_session.client("dynamodb", region_name=AWS_REGION)
```

---

#### **3. Logging (`core/logger.py`)**
Set up structured logging for debugging.

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
```

---

#### **4. Error Handling (`core/error_handler.py`)**
Centralize error handling for DynamoDB operations.

```python
import botocore.exceptions
from core.logger import logger


def handle_dynamodb_errors(func):
    """Decorator to handle DynamoDB errors."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except botocore.exceptions.NoCredentialsError:
            logger.error("AWS credentials not found.")
            raise
        except botocore.exceptions.ClientError as e:
            logger.error(f"DynamoDB Client Error: {e.response['Error']['Message']}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            raise
    return wrapper
```

---

#### **5. Parameterized Queries (`utils/queries.py`)**
Simplify query operations.

```python
from core.error_handler import handle_dynamodb_errors


class DynamoDBQueries:
    def __init__(self, table):
        self.table = table

    @handle_dynamodb_errors
    def get_item(self, key):
        return self.table.get_item(Key=key)

    @handle_dynamodb_errors
    def put_item(self, item):
        return self.table.put_item(Item=item)

    @handle_dynamodb_errors
    def delete_item(self, key):
        return self.table.delete_item(Key=key)
```

---

#### **6. Batch Operations (`utils/batch_operations.py`)**
Handle batch operations across multiple tables.

```python
from core.error_handler import handle_dynamodb_errors


@handle_dynamodb_errors
def batch_write(client, request_items):
    return client.batch_write_item(RequestItems=request_items)
```

---

#### **7. Transaction Support (`utils/transactions.py`)**
Enable cross-table transactions.

```python
from core.error_handler import handle_dynamodb_errors


@handle_dynamodb_errors
def transact_write(client, items):
    return client.transact_write_items(TransactItems=items)
```

---

#### **8. Example Usage (`examples/demo.py`)**

```python
from core.session_manager import DynamoDBSessionManager
from utils.queries import DynamoDBQueries
from utils.batch_operations import batch_write
from utils.transactions import transact_write
from core.logger import logger

# Initialize session manager
manager = DynamoDBSessionManager()
client = manager.get_client()
resource = manager.get_resource()
table_name = "example_table"

# Single table operations
table = resource.Table(table_name)
queries = DynamoDBQueries(table)

# Insert an item
queries.put_item({"id": "1", "name": "John Doe"})
logger.info("Inserted an item into the table.")

# Batch write
batch_write(
    client,
    {
        table_name: [
            {
                "PutRequest": {
                    "Item": {"id": {"S": "2"}, "name": {"S": "Jane Doe"}}
                }
            }
        ]
    }
)

# Transaction
transact_write(
    client,
    [
        {
            "Put": {
                "TableName": table_name,
                "Item": {"id": {"S": "3"}, "name": {"S": "Transaction Item"}}
            }
        }
    ]
)
logger.info("Transaction completed.")
```

---

### **Features Implemented**

| **Feature**               | **Implementation**                                                 |
|----------------------------|--------------------------------------------------------------------|
| **Session Management**     | `DynamoDBSessionManager` handles synchronous and async sessions.  |
| **Error Handling**         | `handle_dynamodb_errors` decorator for consistent error handling. |
| **Parameterized Queries**  | `DynamoDBQueries` for simplified query operations.                |
| **Batch Operations**       | `batch_write` for batch writes to multiple tables.                |
| **Transaction Support**    | `transact_write` for cross-table atomic operations.               |
| **Timeout and Retries**    | Managed via `AWS_RETRY_CONFIG` and `Config`.                      |
| **Asynchronous Support**   | Async client creation with `aioboto3`.                            |
| **Logging**                | Centralized logging via `core/logger.py`.                         |

---

This structure ensures maintainability and modularity. Let me know if you'd like to expand or modify this!