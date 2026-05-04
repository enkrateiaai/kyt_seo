#!/usr/bin/env python3
from ib_insync import IB, util

util.startLoop()

def connect(host='127.0.0.1', port=7497, client_id=1) -> IB:
    ib = IB()
    ib.connect(host, port, clientId=client_id)
    print(f"Connected: {ib.isConnected()}")
    print(f"Server version: {ib.client.serverVersion()}")
    return ib

if __name__ == '__main__':
    ib = connect()
    print(f"Managed accounts: {ib.managedAccounts()}")
    ib.disconnect()
    print("Disconnected.")
