import pytest
import os
import io
import re
from unittest.mock import patch, MagicMock
from fastapi import UploadFile
from app.blueprints.products import upload_image

def test_upload_image_local_fallback_no_token():
    env_mock = {
        "GITHUB_TOKEN": "",
        "GITHUB_REPO": "test_repo",
        "GITHUB_USERNAME": "test_user"
    }
    with patch.dict(os.environ, env_mock):
        dummy_file = UploadFile(filename="test.png", file=io.BytesIO(b"dummy content"))
        url = upload_image(dummy_file, 101)
        assert url.startswith("/api/products/uploads/prod_101_")

@patch("httpx.Client")
def test_upload_image_github_success(mock_client_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_response.json.return_value = {
        "content": {
            "download_url": "https://raw.githubusercontent.com/test_user/test_repo/main/images/prod_101_mocked.png"
        }
    }
    mock_client.put.return_value = mock_response
    mock_client_class.return_value.__enter__.return_value = mock_client
    
    env_mock = {
        "GITHUB_TOKEN": "ghp_mocktoken",
        "GITHUB_REPO": "test_repo",
        "GITHUB_USERNAME": "test_user"
    }
    with patch.dict(os.environ, env_mock):
        dummy_file = UploadFile(filename="test.png", file=io.BytesIO(b"dummy content"))
        url = upload_image(dummy_file, 101)
        assert url == "https://raw.githubusercontent.com/test_user/test_repo/main/images/prod_101_mocked.png"
        
        mock_client.put.assert_called_once()
        args, kwargs = mock_client.put.call_args
        put_url = args[0]
        assert put_url.startswith("https://api.github.com/repos/test_user/test_repo/contents/images/prod_101_")
        assert put_url.endswith("_test.png")
        assert kwargs["headers"]["Authorization"] == "Bearer ghp_mocktoken"
        assert kwargs["headers"]["Accept"] == "application/vnd.github+json"
        assert kwargs["headers"]["X-GitHub-Api-Version"] == "2022-11-28"
        assert "content" in kwargs["json"]

@patch("httpx.Client")
def test_upload_image_github_success_with_slash_repo(mock_client_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_response.json.return_value = {
        "content": {
            "download_url": "https://raw.githubusercontent.com/owner_user/custom_repo/main/images/prod_101_mocked.png"
        }
    }
    mock_client.put.return_value = mock_response
    mock_client_class.return_value.__enter__.return_value = mock_client
    
    env_mock = {
        "GITHUB_TOKEN": "ghp_mocktoken",
        "GITHUB_REPO": "owner_user/custom_repo",
        "GITHUB_USERNAME": "ignored_user"
    }
    with patch.dict(os.environ, env_mock):
        dummy_file = UploadFile(filename="test.png", file=io.BytesIO(b"dummy content"))
        url = upload_image(dummy_file, 101)
        assert url == "https://raw.githubusercontent.com/owner_user/custom_repo/main/images/prod_101_mocked.png"
        
        mock_client.put.assert_called_once()
        args, _ = mock_client.put.call_args
        put_url = args[0]
        assert put_url.startswith("https://api.github.com/repos/owner_user/custom_repo/contents/images/prod_101_")

@patch("httpx.Client")
def test_upload_image_github_failed_fallback(mock_client_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Bad Request"
    mock_client.put.return_value = mock_response
    mock_client_class.return_value.__enter__.return_value = mock_client
    
    env_mock = {
        "GITHUB_TOKEN": "ghp_mocktoken",
        "GITHUB_REPO": "test_repo",
        "GITHUB_USERNAME": "test_user"
    }
    with patch.dict(os.environ, env_mock):
        dummy_file = UploadFile(filename="test.png", file=io.BytesIO(b"dummy content"))
        url = upload_image(dummy_file, 101)
        assert url.startswith("/api/products/uploads/prod_101_")
