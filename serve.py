from fastapi import FastAPI, Depends, HTTPException, Request
from ipaddress import ip_address, ip_network
from fastapi.staticfiles import StaticFiles
from typing import Optional

app = FastAPI()

# Configure static file serving
app.mount("/", StaticFiles(directory="build", html=True), name="static")

TRUSTED_IPS = {
    ip_network("129.240.118.24/32"),  # Replace with your trusted IPs
    ip_network("129.240.118.31/32"),
}

def trusted_ips():
    return TRUSTED_IPS

def check_trusted_ip_and_header(request: Request, trusted_ips: set = Depends(trusted_ips)):
    client_ip = ip_address(request.client.host)
    if not any(client_ip in net for net in trusted_ips):
        raise HTTPException(status_code=403, detail="Not a trusted IP")

    trusted_header: Optional[str] = request.headers.get('X-My-Custom-Header')
    if not trusted_header:
        raise HTTPException(status_code=403, detail="Missing or empty trusted header")
    
    return client_ip


@app.get("/")
async def read_root(client_ip: str = Depends(check_trusted_ip_and_header)):
    return {"Hello": f"Trusted client {client_ip}"}
    
@app.get("/check.txt")
async def read_root(client_ip: str = Depends(check_trusted_ip_and_header)):
    return {"all ok"}