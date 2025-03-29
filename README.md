# MUST EP2000Pro state script
The script dumps current inverter state to the output.
Based on PowerMonitor analysys.
Tested on Luxeon UPS-500ZR.
# Installation
```npm install```
# Usage
Dump current state:\
```node index <port> [json|line]```\
\
Set register value:\
```node set <port> <reg> <value>```\
\
To list available to set registers, run ```node set``` without any parameters.
 
