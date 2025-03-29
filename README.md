# MUST EP2000Pro
This scripts allows you to monitor and configure the MUST EP2000Pro compatible inverters. 
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
 
