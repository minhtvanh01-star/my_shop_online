Test a live API endpoint on the local dev server (must be running on port 4000).

$ARGUMENTS should be in the format: `METHOD /path [body_json]`

Examples:
- `GET /health`
- `POST /api/v1/auth/login {"email":"test@example.com","password":"secret123"}`
- `GET /api/v1/products?page=1&limit=10`

Steps:
1. Parse the method, path, and optional JSON body from $ARGUMENTS.
2. Run the curl command:
   - GET: `curl -s http://localhost:4000<path>`
   - POST/PUT/PATCH: `curl -s -X <METHOD> http://localhost:4000<path> -H "Content-Type: application/json" -d '<body>'`
   - For authenticated routes, prompt for a Bearer token if not provided.
3. Pretty-print the JSON response.
4. Report: status code, response body, and whether it matches expected behavior.
