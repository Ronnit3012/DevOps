Here’s how you can write functional-based tests for `get_session`, `get_client`, `get_resource`, and `get_async_client`. Each test is a standalone function without relying on a class-based `unittest.TestCase` structure.

### Functional-Based Test Code

```python
import asyncio
from unittest.mock import patch, MagicMock
from core.session_manager import get_session, get_client, get_resource, get_async_client


def test_get_session():
    """Test the get_session function."""
    with patch("core.session_manager.boto3.Session") as mock_boto3_session:
        mock_session = MagicMock()
        mock_boto3_session.return_value = mock_session

        session = get_session()

        assert session == mock_session
        mock_boto3_session.assert_called_once_with(region_name="us-east-1")  # Replace with AWS_REGION


def test_get_client():
    """Test the get_client function."""
    with patch("core.session_manager.boto3.Session") as mock_boto3_session:
        mock_session = MagicMock()
        mock_client = MagicMock()
        mock_session.client.return_value = mock_client
        mock_boto3_session.return_value = mock_session

        client = get_client()

        assert client == mock_client
        mock_boto3_session.assert_called_once_with(region_name="us-east-1")  # Replace with AWS_REGION
        mock_session.client.assert_called_once_with(
            "dynamodb",
            config=MagicMock(),  # Ensuring Config object is passed
        )


def test_get_resource():
    """Test the get_resource function."""
    with patch("core.session_manager.boto3.Session") as mock_boto3_session:
        mock_session = MagicMock()
        mock_resource = MagicMock()
        mock_session.resource.return_value = mock_resource
        mock_boto3_session.return_value = mock_session

        resource = get_resource()

        assert resource == mock_resource
        mock_boto3_session.assert_called_once_with(region_name="us-east-1")  # Replace with AWS_REGION
        mock_session.resource.assert_called_once_with("dynamodb")


async def test_get_async_client():
    """Test the get_async_client function."""
    with patch("core.session_manager.aioboto3.Session") as mock_aioboto3_session:
        mock_session = MagicMock()
        mock_async_client = MagicMock()
        mock_session.client.return_value = mock_async_client
        mock_aioboto3_session.return_value = mock_session

        async_client = await get_async_client()

        assert async_client == mock_async_client
        mock_aioboto3_session.assert_called_once()
        mock_session.client.assert_called_once_with("dynamodb", region_name="us-east-1")  # Replace with AWS_REGION


def run_tests():
    """Run all tests."""
    print("Running test_get_session...")
    test_get_session()
    print("Passed ✅\n")

    print("Running test_get_client...")
    test_get_client()
    print("Passed ✅\n")

    print("Running test_get_resource...")
    test_get_resource()
    print("Passed ✅\n")

    print("Running test_get_async_client...")
    asyncio.run(test_get_async_client())
    print("Passed ✅\n")


if __name__ == "__main__":
    run_tests()
```

---

### Explanation:
1. **Independent Test Functions**:
   - Each test is implemented as a standalone function. This follows a functional programming style.

2. **Patching**:
   - The `@patch` decorators are replaced with `with patch(...)` for inline mocking.

3. **Assertions**:
   - Using `assert` instead of `self.assertEqual` or similar methods from `unittest`.

4. **Running Tests**:
   - The `run_tests()` function sequentially calls each test function.
   - For asynchronous tests, `asyncio.run()` is used to handle the coroutine.

5. **Output**:
   - Prints the status of each test (e.g., `Passed ✅`) for better readability.

---

### Running the Tests:
- Save the code in a Python file and execute it directly:
  ```bash
  python test_file_name.py
  ```
- Replace `test_file_name.py` with the name of the file containing this test script.

This approach eliminates class dependencies, keeping the tests lightweight and functional.
