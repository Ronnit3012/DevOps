Here’s how you can write unit tests for the `get_session`, `get_client`, `get_resource`, and `get_async_client` functions in your functional-based session manager. These tests use the `unittest` library along with `unittest.mock` to mock AWS SDK calls.

### Test Code:

```python
import unittest
from unittest.mock import patch, MagicMock
from core.session_manager import get_session, get_client, get_resource, get_async_client

# Mock settings
AWS_REGION = "us-east-1"
AWS_RETRY_CONFIG = {"max_attempts": 5}
TIMEOUT = 10


class TestDynamoDBSessionManager(unittest.TestCase):
    @patch("core.session_manager.boto3.Session")
    def test_get_session(self, mock_boto3_session):
        """Test the get_session function."""
        mock_session = MagicMock()
        mock_boto3_session.return_value = mock_session

        session = get_session()

        self.assertEqual(session, mock_session)
        mock_boto3_session.assert_called_once_with(region_name=AWS_REGION)

    @patch("core.session_manager.boto3.Session")
    def test_get_client(self, mock_boto3_session):
        """Test the get_client function."""
        mock_session = MagicMock()
        mock_client = MagicMock()
        mock_session.client.return_value = mock_client
        mock_boto3_session.return_value = mock_session

        client = get_client()

        self.assertEqual(client, mock_client)
        mock_boto3_session.assert_called_once_with(region_name=AWS_REGION)
        mock_session.client.assert_called_once_with(
            "dynamodb",
            config=unittest.mock.ANY,  # Ensuring Config object is passed
        )

    @patch("core.session_manager.boto3.Session")
    def test_get_resource(self, mock_boto3_session):
        """Test the get_resource function."""
        mock_session = MagicMock()
        mock_resource = MagicMock()
        mock_session.resource.return_value = mock_resource
        mock_boto3_session.return_value = mock_session

        resource = get_resource()

        self.assertEqual(resource, mock_resource)
        mock_boto3_session.assert_called_once_with(region_name=AWS_REGION)
        mock_session.resource.assert_called_once_with("dynamodb")

    @patch("core.session_manager.aioboto3.Session")
    async def test_get_async_client(self, mock_aioboto3_session):
        """Test the get_async_client function."""
        mock_session = MagicMock()
        mock_async_client = MagicMock()
        mock_session.client.return_value = mock_async_client
        mock_aioboto3_session.return_value = mock_session

        async_client = await get_async_client()

        self.assertEqual(async_client, mock_async_client)
        mock_aioboto3_session.assert_called_once()
        mock_session.client.assert_called_once_with("dynamodb", region_name=AWS_REGION)


if __name__ == "__main__":
    unittest.main()
```

---

### Explanation of the Tests:

1. **Mocking `boto3` and `aioboto3`**:
   - `boto3.Session` and `aioboto3.Session` are mocked using `@patch` decorators. This prevents actual AWS calls during testing.
   - `MagicMock` is used to simulate the behavior of AWS sessions, clients, and resources.

2. **Testing `get_session`**:
   - Ensures the function initializes a session correctly with the region name.

3. **Testing `get_client`**:
   - Verifies that the DynamoDB client is created with the correct configuration and is returned properly.

4. **Testing `get_resource`**:
   - Confirms the resource initialization using the session and ensures the `dynamodb` resource is fetched.

5. **Testing `get_async_client`**:
   - Uses `async def` to test the asynchronous `get_async_client`.
   - Mocks the `aioboto3` session and its client creation method.

---

### Running the Tests:
- Save the test file and run it using:
  ```bash
  python -m unittest test_file_name.py
  ```
- Replace `test_file_name.py` with the actual name of the file containing the tests.

This test suite ensures all your session manager functions behave as expected while keeping the tests isolated from AWS services.
