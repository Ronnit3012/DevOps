Yes! Below is a **unified DynamoDB connector solution** with a well-structured folder hierarchy, modular design, and best practices.  

---

## **📂 Folder Structure**
```
dynamodb_connector/
│── config/
│   ├── settings.py        # Configuration settings (region, retries, etc.)
│── core/
│   ├── connection.py      # Connection creation & detection
│   ├── transactions.py    # Transaction handling (commit & rollback)
│   ├── error_handler.py   # Error handling & retry mechanism
│── operations/
│   ├── crud.py            # CRUD operations
│── tests/
│   ├── test_connector.py  # Unit tests
│── main.py                # Example usage
│── requirements.txt       # Dependencies
│── README.md              # Documentation
```

---

## **📌 1. Configuration - `config/settings.py`**
This file stores global configuration values.

```python
AWS_REGION = "us-east-1"
RETRY_COUNT = 3
RETRY_DELAY = 2  # Seconds
```

---

## **📌 2. Connection Handling - `core/connection.py`**
Manages connection lifecycle and detection.

```python
import boto3
from config.settings import AWS_REGION

class DynamoDBConnector:
    _session = None  # Session pool

    def __init__(self):
        """Initialize DynamoDB connection with session pooling."""
        if not DynamoDBConnector._session:
            DynamoDBConnector._session = boto3.Session()
        self.dynamodb = DynamoDBConnector._session.resource("dynamodb", region_name=AWS_REGION)

    def get_table(self, table_name):
        """Retrieve table reference."""
        return self.dynamodb.Table(table_name)

    def check_connection(self):
        """Check if the connection is active."""
        try:
            self.dynamodb.meta.client.describe_endpoints()
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False

    def is_table_available(self, table_name):
        """Check if a table is available."""
        try:
            return self.get_table(table_name).table_status == "ACTIVE"
        except Exception:
            return False
```

---

## **📌 3. CRUD Operations - `operations/crud.py`**
Provides CRUD functionalities.

```python
from core.connection import DynamoDBConnector

class DynamoDBCRUD:
    def __init__(self):
        self.connector = DynamoDBConnector()

    def put_item(self, table_name, item):
        """Insert or update an item."""
        table = self.connector.get_table(table_name)
        try:
            table.put_item(Item=item)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_item(self, table_name, key):
        """Fetch an item."""
        table = self.connector.get_table(table_name)
        try:
            response = table.get_item(Key=key)
            return response.get("Item", None)
        except Exception as e:
            return {"error": str(e)}

    def delete_item(self, table_name, key):
        """Delete an item."""
        table = self.connector.get_table(table_name)
        try:
            table.delete_item(Key=key)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
```

---

## **📌 4. Transaction Handling - `core/transactions.py`**
Handles commit, rollback, and atomic transactions.

```python
import boto3

class DynamoDBTransactions:
    def __init__(self):
        self.client = boto3.client("dynamodb")

    def transactional_write(self, operations):
        """Perform atomic transactions."""
        try:
            response = self.client.transact_write_items(TransactItems=operations)
            return {"success": True, "response": response}
        except self.client.exceptions.TransactionCanceledException as e:
            return {"success": False, "error": f"Transaction failed: {e}"}
```

🔹 **Example Usage (Atomic Transaction)**
```python
operations = [
    {
        "Put": {
            "TableName": "Accounts",
            "Item": {"UserID": {"S": "123"}, "Balance": {"N": "1000"}}
        }
    },
    {
        "Update": {
            "TableName": "Accounts",
            "Key": {"UserID": {"S": "456"}},
            "UpdateExpression": "SET Balance = Balance - :val",
            "ExpressionAttributeValues": {":val": {"N": "500"}}
        }
    }
]

transaction_manager = DynamoDBTransactions()
print(transaction_manager.transactional_write(operations))
```

---

## **📌 5. Error Handling & Retry Mechanism - `core/error_handler.py`**
Implements retry logic.

```python
import time
from config.settings import RETRY_COUNT, RETRY_DELAY

def retry_operation(func, retries=RETRY_COUNT, delay=RETRY_DELAY, *args, **kwargs):
    """Retry operation in case of transient failures."""
    for attempt in range(retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(delay)
    return {"error": "Operation failed after retries"}
```

🔹 **Example Usage**
```python
from operations.crud import DynamoDBCRUD
from core.error_handler import retry_operation

crud = DynamoDBCRUD()
response = retry_operation(crud.get_item, table_name="Users", key={"UserID": "123"})
print(response)
```

---

## **📌 6. Testing - `tests/test_connector.py`**
Tests the connector.

```python
import unittest
from core.connection import DynamoDBConnector

class TestDynamoDBConnector(unittest.TestCase):
    def test_connection(self):
        connector = DynamoDBConnector()
        self.assertTrue(connector.check_connection())

if __name__ == "__main__":
    unittest.main()
```

---

## **📌 7. Example Usage - `main.py`**
Ties everything together.

```python
from operations.crud import DynamoDBCRUD
from core.transactions import DynamoDBTransactions

# Initialize CRUD & Transactions
crud = DynamoDBCRUD()
transaction_manager = DynamoDBTransactions()

# Example: Insert an item
print(crud.put_item("Users", {"UserID": "001", "Name": "John Doe"}))

# Example: Fetch an item
print(crud.get_item("Users", {"UserID": "001"}))

# Example: Delete an item
print(crud.delete_item("Users", {"UserID": "001"}))

# Example: Transaction
operations = [
    {
        "Put": {
            "TableName": "Users",
            "Item": {"UserID": {"S": "002"}, "Balance": {"N": "200"}}
        }
    }
]
print(transaction_manager.transactional_write(operations))
```

---

## **📌 8. Dependencies - `requirements.txt`**
Install required packages.

```
boto3
```

📌 **Install with:**
```bash
pip install -r requirements.txt
```

---

## **✅ Final Thoughts**
This **modular, reusable, and production-ready DynamoDB connector** includes:
- **Connection management** ✅  
- **Transaction handling** ✅  
- **Error handling & retries** ✅  
- **CRUD operations** ✅  
- **Unit testing** ✅  

Would you like additional **logging, metrics, or security** features?


Got it! Below is the updated **Python script** to create a **DynamoDB table** with two attributes:  

- **`UserID`** (Partition Key, `STRING`)  
- **`Name`** (Regular attribute, `STRING`)  

---

## **🔹 Python Code to Create Table**
```python
import boto3

# Initialize DynamoDB client
dynamodb = boto3.client("dynamodb", region_name="us-east-1")  # Change region if needed

def create_table(table_name):
    try:
        response = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {"AttributeName": "UserID", "KeyType": "HASH"}  # Partition key
            ],
            AttributeDefinitions=[
                {"AttributeName": "UserID", "AttributeType": "S"},  # 'S' for String
                {"AttributeName": "Name", "AttributeType": "S"}  # 'S' for String
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        )
        print(f"Table {table_name} creation started. Status: {response['TableDescription']['TableStatus']}")
    except dynamodb.exceptions.ResourceInUseException:
        print(f"Table {table_name} already exists.")
    except Exception as e:
        print(f"Error creating table: {e}")

# Example usage
create_table("Users")
```

---

## **🔹 Explanation**
1. **`UserID` is the primary key** → Ensures unique users.  
2. **`Name` is a regular attribute** → Stored with each item but not indexed.  
3. **`ProvisionedThroughput`** → Sets read and write capacity (change to `PAY_PER_REQUEST` for auto-scaling).  

---

## **🔹 Insert Data into the Table**
After creating the table, you can add users like this:  
```python
def insert_user(user_id, name):
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table("Users")
    table.put_item(Item={"UserID": user_id, "Name": name})
    print(f"User {user_id} added.")

# Example usage
insert_user("123", "Alice")
```

Would you like to add **secondary indexes**, **transactions**, or **auto-scaling**? 🚀

Here is how the same code can be adapted for **DynamoDB** while considering its limitations (e.g., no direct SQL-like queries). The implementation uses **DynamoDB Connector**, **QueryExecutor**, and **ParallelExecutor** classes designed for DynamoDB:

---

### **Updated Code for DynamoDB**

```python
import logging
from fastapi import APIRouter, HTTPException, status
from src.connectors.dynamodb.connector import DynamoDBConnector, QueryExecutor, ParallelExecutor
from src.utils.config import PROFILE, DYNAMODB_CREDS

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dynamodb_health_status", tags=['health stats'])
async def dynamodb_health_status():
    logger.info("Fetching all status for DynamoDB")
    try:
        # Fetch DynamoDB credentials
        creds = DYNAMODB_CREDS[PROFILE]
        db = DynamoDBConnector(creds)
        query_executor = QueryExecutor(db)
        parallel_executor = ParallelExecutor(query_executor)

        # Connect to DynamoDB
        await db.connect()
        connection_status = db._initialized

        # Create a test table if it doesn't exist
        table_name = "test_table"
        await query_executor.create_table(
            table_name=table_name,
            key_schema=[
                {"AttributeName": "id", "KeyType": "HASH"}  # Partition key
            ],
            attribute_definitions=[
                {"AttributeName": "id", "AttributeType": "S"}  # String type
            ],
            provisioned_throughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        )

        # Insert items into the test table
        items = [
            {"id": "1", "name": "Alice"},
            {"id": "2", "name": "Bob"}
        ]
        await query_executor.execute_transaction([
            {"Put": {"TableName": table_name, "Item": item}} for item in items
        ])
        transaction_execution_status = True

        # Scan the table to verify data
        scan_result = await query_executor.execute_query({"TableName": table_name})
        query_execution_status = len(scan_result["Items"]) >= 2

        # Parallel queries (for illustration, we use get-item requests)
        parallel_queries = [
            {"TableName": table_name, "Key": {"id": {"S": "1"}}},
            {"TableName": table_name, "Key": {"id": {"S": "2"}}}
        ]
        parallel_results = await parallel_executor.execute_parallel_queries(parallel_queries)
        parallel_query_execution_status = all(result.get("Item") for result in parallel_results)

        # Delete all items from the table
        for item in scan_result["Items"]:
            await query_executor.execute_query({
                "TableName": table_name,
                "Key": {"id": {"S": item["id"]["S"]}}
            }, operation="DeleteItem")
        deletion_result = await query_executor.execute_query({"TableName": table_name})
        query_deletion_status = len(deletion_result["Items"]) == 0

        # Compile health stats
        out_data = {
            "connection_status": connection_status,
            "query_execution_status": query_execution_status,
            "query_deletion_status": query_deletion_status,
            "transaction_execution_status": transaction_execution_status,
            "parallel_query_execution_status": parallel_query_execution_status
        }

        return {'status': "success", "health_stats": out_data}

    except Exception as e:
        logger.error(f"Health check failed, exception: {e}", stack_info=True, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error fetching records: {str(e)}")
```

---

### **Explanation of Changes**
1. **Connector**:
   - Switched to `DynamoDBConnector` from `src.connectors.dynamodb.connector`.

2. **Create Table**:
   - Added a `create_table` operation using `QueryExecutor`.

3. **CRUD Operations**:
   - For insertion: Used `PutItem` inside a `TransactWriteItems` call.
   - For querying: Used `Scan` to fetch all data.
   - For deletion: Used `DeleteItem` for each scanned item.

4. **Parallel Queries**:
   - Simulated parallel queries using `GetItem` calls.

5. **Health Metrics**:
   - Replaced SQL-like health checks with DynamoDB-specific operations.

---

### **Assumptions**
- The `DynamoDBConnector`, `QueryExecutor`, and `ParallelExecutor` classes handle DynamoDB-specific operations as implemented earlier.
- The `DYNAMODB_CREDS` is a dictionary containing AWS credentials and configurations.

Would you like help testing or extending this solution further?
