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


Here’s how you can add **Create Table** and **Delete Table** queries to the `DynamoDBQueries` class. These queries are useful for managing table lifecycle operations programmatically.

---

### **Update: Parameterized Queries (`utils/queries.py`)**

Add `create_table` and `delete_table` methods to the `DynamoDBQueries` class.

```python
from core.error_handler import handle_dynamodb_errors
from core.logger import logger


class DynamoDBQueries:
    def __init__(self, resource):
        """Initialize with a DynamoDB resource."""
        self.resource = resource

    @handle_dynamodb_errors
    def create_table(self, table_name, key_schema, attribute_definitions, provisioned_throughput):
        """
        Create a DynamoDB table.
        :param table_name: Name of the table to create.
        :param key_schema: Key schema for the table.
        :param attribute_definitions: Attribute definitions for the table.
        :param provisioned_throughput: Provisioned throughput (Read/Write capacity).
        :return: Response from DynamoDB.
        """
        logger.info(f"Creating table {table_name}...")
        return self.resource.create_table(
            TableName=table_name,
            KeySchema=key_schema,
            AttributeDefinitions=attribute_definitions,
            ProvisionedThroughput=provisioned_throughput
        )

    @handle_dynamodb_errors
    def delete_table(self, table_name):
        """
        Delete a DynamoDB table.
        :param table_name: Name of the table to delete.
        :return: Response from DynamoDB.
        """
        logger.info(f"Deleting table {table_name}...")
        table = self.resource.Table(table_name)
        return table.delete()
```

---

### **Example Usage**

Here's how you can use these methods to create and delete tables in DynamoDB.

#### **Example (`examples/demo.py`)**

```python
from core.session_manager import DynamoDBSessionManager
from utils.queries import DynamoDBQueries
from core.logger import logger

# Initialize session manager and resource
manager = DynamoDBSessionManager()
resource = manager.get_resource()

# Initialize the DynamoDBQueries instance
queries = DynamoDBQueries(resource)

# Table details
table_name = "example_table"
key_schema = [
    {"AttributeName": "id", "KeyType": "HASH"}  # Partition key
]
attribute_definitions = [
    {"AttributeName": "id", "AttributeType": "S"}  # String type
]
provisioned_throughput = {
    "ReadCapacityUnits": 5,
    "WriteCapacityUnits": 5
}

# Create a table
try:
    response = queries.create_table(table_name, key_schema, attribute_definitions, provisioned_throughput)
    logger.info(f"Table {table_name} created successfully!")
except Exception as e:
    logger.error(f"Failed to create table {table_name}: {e}")

# Perform other operations...

# Delete the table
try:
    response = queries.delete_table(table_name)
    logger.info(f"Table {table_name} deleted successfully!")
except Exception as e:
    logger.error(f"Failed to delete table {table_name}: {e}")
```

---

### **Key Concepts**

#### **1. Create Table**
- **Key Schema**: Specifies the primary key (partition and/or sort key).
- **Attribute Definitions**: Defines the attributes used in the key schema and indexes.
- **Provisioned Throughput**: Configures the read and write capacity units (RCUs and WCUs).

Example for a **table with only a partition key**:
```python
key_schema = [
    {"AttributeName": "id", "KeyType": "HASH"}  # Partition key
]
attribute_definitions = [
    {"AttributeName": "id", "AttributeType": "S"}  # String type
]
provisioned_throughput = {
    "ReadCapacityUnits": 5,
    "WriteCapacityUnits": 5
}
```

#### **2. Delete Table**
The `delete_table` method simply deletes the specified table. Deletion is immediate, but resources might take a short time to become available again.

---

### **Additional Enhancements**
1. **Wait for Table Creation/Deletion**: 
   - Use the `wait_until_exists` or `wait_until_not_exists` methods on the table object.
   ```python
   table = resource.Table(table_name)
   table.wait_until_exists()
   logger.info(f"Table {table_name} is now active.")
   ```

2. **Handle On-Demand Mode (Optional)**:
   - If you're using **on-demand capacity mode**, you don't need to provide `ProvisionedThroughput`.

---

This addition ensures the connector can handle table creation and deletion operations seamlessly. Let me know if you'd like to add more features or extend this functionality!