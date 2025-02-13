from unittest.mock import patch, MagicMock
import pytest
import botocore.exceptions
from core.logger import logger
from core.decorators import handle_dynamodb_errors


# Sample function to test the decorator
@handle_dynamodb_errors
def dummy_function(should_fail, error_type=None):
    if should_fail:
        if error_type == "NoCredentialsError":
            raise botocore.exceptions.NoCredentialsError()
        elif error_type == "ClientError":
            raise botocore.exceptions.ClientError(
                {"Error": {"Message": "A ClientError occurred"}}, "operation_name"
            )
        else:
            raise Exception("An unexpected error")
    return "Success"


def test_handle_no_credentials_error():
    """Test handling of NoCredentialsError."""
    with patch("core.logger.logger.error") as mock_logger:
        with pytest.raises(botocore.exceptions.NoCredentialsError):
            dummy_function(should_fail=True, error_type="NoCredentialsError")
        
        mock_logger.assert_called_once_with("AWS credentials not found.")


def test_handle_client_error():
    """Test handling of ClientError."""
    with patch("core.logger.logger.error") as mock_logger:
        with pytest.raises(botocore.exceptions.ClientError):
            dummy_function(should_fail=True, error_type="ClientError")
        
        mock_logger.assert_called_once_with("DynamoDB Client Error: A ClientError occurred")


def test_handle_unexpected_error():
    """Test handling of unexpected errors."""
    with patch("core.logger.logger.error") as mock_logger:
        with pytest.raises(Exception, match="An unexpected error"):
            dummy_function(should_fail=True, error_type="UnexpectedError")
        
        mock_logger.assert_called_once_with("An unexpected error occurred: An unexpected error")


def test_successful_execution():
    """Test successful execution without errors."""
    with patch("core.logger.logger.error") as mock_logger:
        result = dummy_function(should_fail=False)

        assert result == "Success"
        mock_logger.assert_not_called()
