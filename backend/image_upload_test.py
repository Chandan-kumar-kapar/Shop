import os
import base64
import httpx
import uuid

def test_github_upload():
    github_token = os.environ.get("GITHUB_TOKEN")
    github_repo = os.environ.get("GITHUB_REPO", "shop_product_Images")
    github_username = os.environ.get("GITHUB_USERNAME")
    
    owner = github_username
    repo = github_repo
    if github_repo and "/" in github_repo:
        parts = github_repo.split("/", 1)
        owner = parts[0]
        repo = parts[1]
        
    print("--- GitHub Image Upload Test Configuration ---")
    print(f"Token present: {bool(github_token)}")
    print(f"Repository Owner: {owner}")
    print(f"Repository Name: {repo}")
    
    if not github_token:
        print("Error: GITHUB_TOKEN environment variable is not set!")
        return
        
    if not owner or not repo:
        print("Error: Owner or repository name is missing!")
        return
        
    # Dummy 1x1 transparent PNG image bytes
    dummy_png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )
    
    unique_id = str(uuid.uuid4())[:8]
    filename = f"test_upload_{unique_id}.png"
    path = f"images/{filename}"
    
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    content_b64 = base64.b64encode(dummy_png_bytes).decode("utf-8")
    payload = {
        "message": f"Test image upload {filename}",
        "content": content_b64
    }
    
    print(f"\nSending PUT request to: {url}...")
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.put(url, headers=headers, json=payload)
            if response.status_code in (200, 201):
                res_data = response.json()
                img_url = res_data["content"]["download_url"]
                print("\nSUCCESS!")
                print(f"Status Code: {response.status_code}")
                print(f"Direct raw image URL: {img_url}")
            else:
                print("\nFAILURE!")
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}")
    except Exception as e:
        print(f"\nERROR: Exception occurred: {e}")

if __name__ == "__main__":
    test_github_upload()
