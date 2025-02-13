from unittest.mock import patch, MagicMock
from core.session_manager import get_client


def test_get_client():
    """Test the get_client function by mocking its dependencies."""
    with patch("core.session_manager.get_session") as mock_get_session, \
         patch("core.session_manager.boto3.session.Config") as mock_config:

        # Mock session and client
        mock_session = MagicMock()
        mock_client = MagicMock()
        mock_session.client.return_value = mock_client

        # Mock configuration
        mock_config_instance = MagicMock()
        mock_config.return_value = mock_config_instance

        # Set the return value of get_session
        mock_get_session.return_value = mock_session

        # Call the function under test
        client = get_client()

        # Assertions
        assert client == mock_client  # Verify the returned client is as expected
        mock_get_session.assert_called_once()  # Ensure get_session was called
        mock_session.client.assert_called_once_with(
            "dynamodb",
            config=mock_config_instance  # Ensure Config was passed to client
        )
        mock_config.assert_called_once_with(
            retries=MagicMock(),  # Mocked retries config
            connect_timeout=MagicMock(),  # Mocked timeout config
            read_timeout=MagicMock()  # Mocked timeout config
        )
