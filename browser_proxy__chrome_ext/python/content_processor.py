# python/content_processor.py
import json
import hashlib
import base64


def exec_python(url: str) -> str:
    """Original function to process resource URLs"""
    print(f'url: {url}')
    return f'[python]: loaded {url}'


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def process_page_content(content_json: str) -> str:
    """Process a page content object"""
    try:
        # Parse the input JSON
        content = json.loads(content_json)

        # Extract key components
        url = content.get('url', '')
        html = content.get('html', '')
        title = content.get('title', '')
        timestamp = content.get('timestamp', '')

        # Compute content hash
        content_hash = compute_hash(html)

        # Create a response object
        response = {
            'url': url,
            'title': title,
            'hash': content_hash,
            'timestamp': timestamp,
            'bytes_processed': len(html),
            'status': 'processed',
            'type': 'main_page'
        }

        print(f"Processed page: {title}")
        print(f"URL: {url}")
        print(f"Content hash: {content_hash}")
        print(f"Content size: {len(html)} bytes")

#        print(html)

        # In a future version, this would send to the backend
        # For now, just return the processed info
        return json.dumps(response)

    except Exception as e:
        print(f"Error processing content: {str(e)}")
        return json.dumps({
            'status': 'error',
            'error': str(e)
        })


def process_resource(resource_json: str) -> str:
    """Process a captured resource"""
    try:
        print(" ... in process_resource ...", resource_json)
        # Parse the input JSON
        resource = json.loads(resource_json)

        # Extract key components
        url = resource.get('url', '')
        content = resource.get('content')
        content_type = resource.get('contentType', '')
        resource_type = resource.get('type', '')

        # Skip if no content
        if content is None:
            return json.dumps({
                'url': url,
                'status': 'skipped',
                'reason': 'no_content',
                'type': resource_type
            })

        # Compute content hash
        content_hash = compute_hash(content)

        # Create a response object
        response = {
            'url': url,
            'hash': content_hash,
            'timestamp': resource.get('timestamp', ''),
            'bytes_processed': len(content),
            'status': 'processed',
            'content_type': content_type,
            'resource_type': resource_type
        }

        print(f"Processed resource: {url}")
        print(f"Content type: {content_type}")
        print(f"Resource type: {resource_type}")
        print(f"Content hash: {content_hash}")
        print(f"Content size: {len(content)} bytes")

        # In a future version, this would send to the backend
        # For now, just return the processed info
        return json.dumps(response)

    except Exception as e:
        print(f"Error processing resource: {str(e)}")
        return json.dumps({
            'status': 'error',
            'error': str(e)
        })

# Future functions for backend interaction would go here