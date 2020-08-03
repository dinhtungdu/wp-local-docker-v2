/**
 * External dependencies.
 */
const { table } = require( 'table' );
const chalk = require( 'chalk' );
const logSymbols = require( 'log-symbols' );
const terminalLink = require( 'terminal-link' );

/**
 * Internal dependencies.
 */
const envUtils = require( '../env-utils' );
const makeCommand = require( '../utils/make-command' );
const makeDocker = require( '../utils/make-docker' );

// Add command name, alias and description.
exports.aliases = [ 'ls' ];
exports.command = 'list';
exports.desc = 'Lists all the environments and meta information.';

exports.handler = makeCommand( chalk, logSymbols, async () => {
    try{
        // Create docker object and make sure it is available.
        const docker = makeDocker();
        const dockerStatus = await docker.info();

        // If docker is running, go ahead and check container status for each environment.
        if ( typeof dockerStatus.ID !== 'undefined' ) {
            // Get all the environments and initialize a status array.
            const environments = await envUtils.getAllEnvironments();
            const envStatus = [ [ 'Name', 'Status', 'URL' ] ];

            // Loop through each environment and add details.
            for ( const envSlug of environments ) {
                // Get path of the current environment to perform dedicated checks.
                const envPath = await envUtils.envPath( envSlug );

                // Get current environment host name, use the starting index.
                const envHosts = await envUtils.getEnvHosts( envPath );
                const hostName = `http://${ envHosts[0] }/`;

                try {
                    const containers = await docker.listContainers( { filters: { 'name': [ envSlug ] } } );

                    // Check containers availability and push to list with appropriate status.
                    if ( Array.isArray( containers ) && containers.length ) {
                        envStatus.push( [ envSlug, 'UP', terminalLink( chalk.cyanBright( hostName ), hostName ) ] );
                    } else {
                        envStatus.push( [ envSlug, 'DOWN', terminalLink( chalk.cyanBright( hostName ), hostName ) ] );
                    }
                } catch( ex ) {
                    console.error( ex );
                }
            }

            // Output the environment status.
            console.log( table( envStatus ) );
        }
    } catch( ex ) {
        console.error( chalk.red( 'Docker is not running...' ) );
    }
} );
