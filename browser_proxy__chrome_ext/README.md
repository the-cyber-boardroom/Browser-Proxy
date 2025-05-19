# Browser Proxy Chrome Extension

## Dev setup

Note, at the moment we are including the pyodite files in the actual extension (which has both advantages and disadvantages ), but these files are not commited to Git due to its size

Download instructions:

```

mkdir -p ./pyodide
# Download the pyodide-core package (5.35 MB)
curl -L https://github.com/pyodide/pyodide/releases/download/0.27.6/pyodide-core-0.27.6.tar.bz2 -o pyodide-core.tar.bz2

# Extract it to your extension's pyodide directory
tar -xjf pyodide-core.tar.bz2 -C /pyodide --strip-components=1

# Remove the downloaded archive
rm pyodide-core.tar.bz2
```