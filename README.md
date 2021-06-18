# cadence-to-json
*Made and opinionated by https://zay.codes - Reach out if you want to hire us to help build your Flow apps!*

## Overview
"cadence-to-json" helps you make your cadence repositories expose scripts and transactions in a way that is consumable for use within JavaScript and Flow's Client Library (FCL).
Many current examples of using Flow from JavaScript involve writing Cadence within JavaScript files as strings. This is not a great way to write Cadence, as this
separates where you would write your testing for Cadence transactions and scripts from where you actually use them. And the '.cdc' files do not play well with working
with FCL, because the way contracts have variables in FCL is not the same as how Cadence projects use the 'flow.json' to alias contract imports and control deployments.

## Installation
##### *Bare with the setup, it's worth it*

Do you use **separate repositories (RECOMMENDED)** for all of your cadence and front-end code? Click [here](#separate-repositories-setup) for setup instructions.

Do you use **one repository** for all of your cadence and front-end code? Click [here](#single-repository-setup) for setup instructions.

### Separate Repositories Setup

#### From your Contract repository
`npm -s install cadence-to-js` or `yarn add cadence-to-json`

For the following steps, you may modify them however you'd like to, and this is just how we use it ourselves.

Create a package.json, add the following:
```
{
    "main": "index.js"
    "scripts": {
        "prepare": "mkdir -p lib & node build.js"
    }
}
```

Create a 'build.js' with the following content:

This assumes your cadence transactions and scripts are located at "./cadence/transactions" and "./cadence/scripts" respectively.
```
const fs = require('fs');
const path = require('path');
const transactionsPath = path.join(__dirname, 'cadence', 'transactions', '/')
const scriptsPath = path.join(__dirname, 'cadence', 'scripts', '/')

const convertCadenceToJs = async () => {
    const resultingJs = await require('cadence-to-js')({
        transactions: [ transactionsPath ],
        scripts: [ scriptsPath ],
        config: require('./flow.json')
    })
    fs.writeFile('lib/CadenceToJson.json', JSON.stringify(resultingJs), (err) => {
        if (err) {
            console.error("Failed to read CadenceToJs JSON");
            process.exit(1)
        }
    })
}

convertCadenceToJs()
```

If you have multiple flow.jsons you'd like to merge, you can use lodash with `_.merge(require('./flow.json'), require(./flow.private.json'))` to deep merge them instead of the config value shown above.
``

This will write a JSON file at 'lib/CadenceToJson.json'

To expose that above JSON file for use from your front-end respository, make an `index.js` with the following content:

`module.exports = require('./lib/CadenceToJs.json')`

#### From your front-end Repository

Utilize your contract repository by requiring it, which will return the JSON as a JavaScript object.

`npm install --save MyContractPackage` or `npm install --save ../MyContractPackage` (for local development)

To make use of the JSON that was generated:
```
import { config } from @onflow/fcl
import { scripts, transactions, config } from 'MyContractPackage'

// Fill in FCL config with variables from config
// testnet is hardcoded here, but switch it depending on your environment

const fclConfig = config()
const contractVariables = vars['testnet']
Object.keys(contractVariables).forEach((contractAddressKey) => {
  fclConfig.put(contractAddressKey, contractVariables[contractAddressKey])
})
fclConfig.put("accessNode.api", process.env.REACT_APP_ACCESS_NODE)
fclConfig.put("challenge.handshake", process.env.REACT_APP_WALLET_DISCOVERY)


// If you have a script called MyScript.cdc in cadence, you may access it with the "MyScript" variable

return fcl
    .send([
        fcl.script(scripts.MyScript),
        fcl.args([fcl.arg(lookupAddress, t.Address)]),
    ])
    .then(fcl.decode)

// same deal with transactions, MyTransaction.cdc would be transactions.MyTransaction
```

### Single Repository Setup

TODO
