Sure! Here's your **DynamoDB connector class** implementing the **singleton pattern** and containing the required functions.  

---

### **✅ `dynamo_connector.py`**
```python
import logging
import asyncio
import aioboto3
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DynamoDBConnector:
    _instance = None

    def __new__(cls, creds, region="us-east-1", min_size=1, max_size=10):
        """Returns a singleton instance."""
        if cls._instance is None:
            cls._instance = super(DynamoDBConnector, cls).__new__(cls)
            cls._instance._initialize(creds, region, min_size, max_size)
        return cls._instance

    def _initialize(self, creds, region, min_size, max_size):
        """Initializes the connector."""
        self.creds = creds
        self.region = region
        self.min_size = min_size
        self.max_size = max_size
        self.pool = None
        self.lock = asyncio.Lock()
        self._initialized = False

    async def connect(self):
        """Initialize the connection pool."""
        async with self.lock:
            if not self._initialized:
                self.pool = asyncio.Queue(maxsize=self.max_size)
                for _ in range(self.min_size):
                    conn = await self._create_connection()
                    await self.pool.put(conn)
                self._initialized = True
                logger.info("DynamoDB connection pool initialized.")

    async def _create_connection(self):
        """Creates a new DynamoDB client connection."""
        session = aioboto3.Session()
        return session.client("dynamodb", region_name=self.region, **self.creds)

    async def close(self):
        """Close all connections in the pool."""
        if self.pool is not None:
            while not self.pool.empty():
                conn = await self.pool.get()
                await conn.close()
            self._initialized = False
            logger.info("DynamoDB connections closed.")

    async def _is_connection_valid(self, conn):
        """Check if the connection is still valid."""
        try:
            await conn.list_tables()
            return True
        except Exception as e:
            logger.error(f"Connection validation failed: {e}", exc_info=True)
            return False

    @asynccontextmanager
    async def get_connection(self):
        """Retrieve a connection from the pool with auto-reconnect."""
        if self.pool is None:
            raise RuntimeError("Connection pool is not initialized")

        conn = await self.pool.get()
        try:
            if not await self._is_connection_valid(conn):
                logger.warning("Recreating a new connection due to invalid connection.")
                conn = await self._create_connection()
            yield conn
        finally:
            await self.pool.put(conn)
```

---

### **✅ Explanation**
✔ **Singleton Pattern** → Ensures a single instance of the connector.  
✔ **Connection Pooling** → Maintains reusable connections.  
✔ **Automatic Reconnection** → Checks validity before using a connection.  
✔ **Graceful Closing** → Ensures all connections are properly closed.  

---

### **✅ Example Usage**
```python
import asyncio
from dynamo_connector import DynamoDBConnector

# AWS Credentials
creds = {"aws_access_key_id": "your_key", "aws_secret_access_key": "your_secret"}

async def main():
    db = DynamoDBConnector(creds)
    await db.connect()

    async with db.get_connection() as conn:
        response = await conn.list_tables()
        print("Available Tables:", response["TableNames"])

    await db.close()

asyncio.run(main())
```

---

This should work well as your **DynamoDB connection manager**! 🚀 Let me know if you need modifications.


Here's the **DynamoDB version** of your `QueryExecutor` class, keeping the structure as close as possible to your PostgreSQL version.  

---

### **✅ `query_executor.py`**
```python
import logging
from dynamo_connector import DynamoDBConnector

logger = logging.getLogger(__name__)

class QueryExecutor:
    def __init__(self, db_connector):
        """Initialize QueryExecutor with a DynamoDBConnector instance."""
        self.db = db_connector

    async def execute_query(self, method, params=None):
        """
        Executes a single DynamoDB query.

        Args:
        - method (str): The DynamoDB method (e.g., 'get_item', 'put_item', 'delete_item').
        - params (dict): Parameters for the method.

        Returns:
        - Response from DynamoDB.
        """
        try:
            async with self.db.get_connection() as conn:
                async with conn as dynamodb:
                    method_func = getattr(dynamodb, method, None)
                    if not method_func:
                        raise ValueError(f"Invalid method: {method}")

                    response = await method_func(**(params or {}))
                    return response
        except Exception as e:
            logger.error(f"Query execution failed: {e}", stack_info=True, exc_info=True)
            raise Exception(f"Exception occurred: {e}")

    async def execute_transaction(self, transactions):
        """
        Executes multiple operations in a DynamoDB transaction.

        Args:
        - transactions (list): A list of transaction items.

        Returns:
        - Transaction response from DynamoDB.
        """
        try:
            async with self.db.get_connection() as conn:
                async with conn as dynamodb:
                    await dynamodb.transact_write_items(TransactItems=transactions)
        except Exception as e:
            logger.error(f"Transaction execution failed: {e}", stack_info=True, exc_info=True)
            raise Exception(f"Exception occurred: {e}")
```

---

### **✅ Explanation**
✔ **`execute_query(method, params)`** → Executes single queries dynamically (e.g., `get_item`, `put_item`, `delete_item`).  
✔ **`execute_transaction(transactions)`** → Runs **multiple operations in a transaction**.  
✔ **Method-agnostic execution** → Uses `getattr()` to dynamically call DynamoDB methods.  
✔ **Automatic error handling** → Logs errors and raises exceptions.  

---

### **✅ Example Usage**
```python
import asyncio
from dynamo_connector import DynamoDBConnector
from query_executor import QueryExecutor

# AWS Credentials
creds = {"aws_access_key_id": "your_key", "aws_secret_access_key": "your_secret"}

async def main():
    db = DynamoDBConnector(creds)
    await db.connect()
    
    executor = QueryExecutor(db)

    # Insert an item
    item = {
        "TableName": "Users",
        "Item": {
            "UserID": {"S": "123"},
            "FirstName": {"S": "John"},
            "LastName": {"S": "Doe"},
            "City": {"S": "NYC"},
            "Qualification": {"S": "MSc"},
            "DateOfBirth": {"S": "1990-01-01"}
        }
    }
    await executor.execute_query("put_item", item)

    # Fetch an item
    key = {
        "TableName": "Users",
        "Key": {"UserID": {"S": "123"}}
    }
    result = await executor.execute_query("get_item", key)
    print("Fetched Item:", result.get("Item"))

    # Delete an item
    await executor.execute_query("delete_item", key)

    # Transaction example (adding two users in one operation)
    transaction = [
        {
            "Put": {
                "TableName": "Users",
                "Item": {
                    "UserID": {"S": "456"},
                    "FirstName": {"S": "Alice"}
                }
            }
        },
        {
            "Put": {
                "TableName": "Users",
                "Item": {
                    "UserID": {"S": "789"},
                    "FirstName": {"S": "Bob"}
                }
            }
        }
    ]
    await executor.execute_transaction(transaction)

    await db.close()

asyncio.run(main())
```

---

### **✅ Folder Structure**
```
dynamodb_connector/
│── connectors/
│   ├── dynamo_connector.py  # Manages DB connections
│── queries/
│   ├── query_executor.py    # CRUD operations
│── main.py  # Example usage
```

This version follows your **PostgreSQL `QueryExecutor` class structure** while **adapting it for DynamoDB**. 🚀 Let me know if you need changes!


Here’s your **DynamoDB-compatible `ParallelExecutor`** class, structured exactly like your PostgreSQL version:  

---

### **✅ `parallel_executor.py`**
```python
import asyncio
import logging
from query_executor import QueryExecutor

logger = logging.getLogger(__name__)

class ParallelExecutor:
    def __init__(self, query_executor):
        """Initialize ParallelExecutor with a QueryExecutor instance."""
        self.query_executor = query_executor

    async def execute_parallel_queries(self, queries):
        """
        Executes multiple queries in parallel.

        Args:
        - queries (list): A list of (method, params) tuples.

        Returns:
        - List of results from each query.
        """
        tasks = [asyncio.create_task(self.query_executor.execute_query(method, params)) for method, params in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
```

---

### **✅ Example Usage**
```python
import asyncio
from dynamo_connector import DynamoDBConnector
from query_executor import QueryExecutor
from parallel_executor import ParallelExecutor

# AWS Credentials
creds = {"aws_access_key_id": "your_key", "aws_secret_access_key": "your_secret"}

async def main():
    db = DynamoDBConnector(creds)
    await db.connect()
    
    executor = QueryExecutor(db)
    parallel_executor = ParallelExecutor(executor)

    # Parallel Queries
    queries = [
        ("put_item", {"TableName": "Users", "Item": {"UserID": {"S": "101"}, "FirstName": {"S": "Alice"}}}),
        ("put_item", {"TableName": "Users", "Item": {"UserID": {"S": "102"}, "FirstName": {"S": "Bob"}}}),
        ("put_item", {"TableName": "Users", "Item": {"UserID": {"S": "103"}, "FirstName": {"S": "Charlie"}}})
    ]
    results = await parallel_executor.execute_parallel_queries(queries)
    print("Parallel Query Results:", results)

    await db.close()

asyncio.run(main())
```

---

### **✅ Key Features**
✔ **Same structure as your PostgreSQL `ParallelExecutor`**  
✔ **Executes multiple queries concurrently** using `asyncio.gather()`  
✔ **Handles errors gracefully** with `return_exceptions=True`  

Let me know if you need any changes! 🚀