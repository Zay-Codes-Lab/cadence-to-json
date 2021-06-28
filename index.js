/*
    Takes in path to cadence code, and a flow.json, and spits out an object
    that can be used from FCL as JS

    The bottom in 'module.exports' is where most of the main code is
*/

const path = require('path')
const fs = require('fs')

const readFile = (dir, filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(dir, filename), (err, result) => {
            if (err) { reject(err) }
            resolve({ name: filename, content: result });
        })
    })
}

const readDirectory = (dir) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) { reject(err) }
            
            const allFiles = []
            if (!files || files.length === 0) {
                resolve([])
                return;
            }
            files.forEach((filename) => {
                const readFilePromise = readFile(dir, filename);
                allFiles.push(readFilePromise)
            })
            Promise.all(allFiles).then((output) => {
                resolve(output)
            })
        });
    })
}

// For all locally imported contracts, switch out the import statement
// to use our previously stored variables
const translateCadenceToJs = (config, cadenceSrc) => {
    const contractNames = Object.keys(config.contracts)
    return cadenceSrc.split('\n').map((line) => {
        if (line.trim().startsWith('import')) {
            let newImport = null;
            const lineSplit = line.trim().split(' ')
            contractNames.forEach((name) => {
                if (name === lineSplit[1]) {
                    newImport = `import ${name} from 0x${name}`
                }
            })
            return newImport === null ? line : newImport;
        } else {
            return line;
        }
    }).join('\n')
}

// Detect which account is being used to deploy by reading the flow.json
const getAccountAddressForContract = (config, network, contractName) => {
    const accountAddresses = config.accounts;
    const deploymentAccounts = config.deployments[network]
    if (!deploymentAccounts) {
        return null;
    }
    let toReturn = null;
    Object.keys(deploymentAccounts).forEach((accountName) => {
        const deployedContractNames = deploymentAccounts[accountName]
        if (deployedContractNames.indexOf(contractName) > -1 && accountAddresses[accountName]) {
            toReturn = accountAddresses[accountName].address
        }
    })
    
    // If we didn't get an address here, we would expect that there is an alias
    // that will fill in the address we need, return null from here.
    return toReturn;
}

// Fill in FCL contract variables from flow json configs
const readConfig = (config, network) => {
    const contractVariables = {}
    const contracts = config.contracts

    Object.keys(contracts).forEach((contractName) => {
        const contract = contracts[contractName]
        const defaultContractAddress = getAccountAddressForContract(config, network, contractName)
        if (contract.aliases) {
            const contractKey = `0x${contractName.replace('.cdc', '')}`
            if (contract.aliases[network]) {
                contractVariables[contractKey] = contract.aliases[network]
            } else {
                contractVariables[contractKey] = defaultContractAddress
            }
        } else {
            const contractKey = `0x${contractName.replace('.cdc', '')}`
            contractVariables[contractKey] = defaultContractAddress
        }
    })
    contractVariables['accessNode.api'] = config.networks[network]
    return contractVariables
}

module.exports = function(input) {
    // Fill in variables pertaining to 
    const vars = {
        emulator: readConfig(input.config, 'emulator'),
        testnet: readConfig(input.config, 'testnet'),
        mainnet: readConfig(input.config, 'mainnet')
    }

    // Retrieve all filenames of transactions and scripts
    const readDirPromises = []
    input.transactions.forEach(dir => {
        readDirPromises.push(readDirectory(dir))
    })

    input.scripts.forEach(dir => {
        readDirPromises.push(readDirectory(dir))
    })

    // For all transactions and scripts, read the Cadence and store them as strings
    return Promise.all(readDirPromises).then((output) => {
        const transactions = output[0]
        const scripts = output[1]

        // Switch the cadence transactions and scripts to have variables for imports
        const transactionsMap = {}
        transactions.forEach((transaction) => {
            transactionsMap[transaction.name.replace('.cdc', '')] = translateCadenceToJs(input.config, transaction.content.toString())
        })
        const scriptsMap = {}
        scripts.forEach((script) => {
            scriptsMap[script.name.replace('.cdc', '')] = translateCadenceToJs(input.config, script.content.toString())
        })

        return {
            transactions: transactionsMap,
            scripts: scriptsMap,
            vars: vars
        }
    })
}
