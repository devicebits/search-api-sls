const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')

const ecsClient = new ECSClient({ region: process.env.AWS_REGION })

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2))


  try {
    // Parse request body
    let requestBody = {}
    if (event.body) {
      requestBody = JSON.parse(event.body)
    }

    const {
      customer = requestBody.customer,
      esHost = process.env.ES_HOST,
      esIndex = requestBody.esIndex,
      jdbcConnectionString = process.env.JDBC_CONNECTION_STRING
    } = requestBody

    const jdbcUser = process.env.JDBC_USER
    const jdbcPassword = process.env.JDBC_PSWD

    // Prepare ECS task parameters
    const runTaskParams = {
      cluster: process.env.CLUSTER_NAME,
      launchType: 'FARGATE',
      taskDefinition: process.env.TASK_DEFINITION,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.SUBNETS.split(','),
          securityGroups: process.env.SECURITY_GROUPS.split(','),
          assignPublicIp: 'ENABLED'
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: 'logstashos',
            environment: [
              { name: 'ES_HOST', value: esHost },
              { name: 'CUSTOMER', value: customer },
              { name: 'ES_INDEX', value: esIndex },
              { name: 'JDBC_CONNECTION_STRING', value: jdbcConnectionString },
              { name: 'JDBC_USER', value: jdbcUser },
              { name: 'JDBC_PASSWORD', value: jdbcPassword }
            ]
          }
        ]
      }
    }

    console.log(
      'Running ECS task with params:',
      JSON.stringify(runTaskParams, null, 2)
    )

    // Run the ECS task
    const command = new RunTaskCommand(runTaskParams)
    const response = await ecsClient.send(command)

    console.log('ECS task response:', JSON.stringify(response, null, 2))

    if (response.failures && response.failures.length > 0) {
      console.error('Task failures:', response.failures)
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Failed to start ECS task',
          failures: response.failures
        })
      }
    }

    const taskArn = response.tasks[0].taskArn
    const taskId = taskArn.split('/').pop()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'ECS task started successfully',
        taskArn: taskArn,
        taskId: taskId,
        clusterArn: response.tasks[0].clusterArn,
        taskDefinitionArn: response.tasks[0].taskDefinitionArn,
        lastStatus: response.tasks[0].lastStatus,
        desiredStatus: response.tasks[0].desiredStatus
      })
    }
  } catch (error) {
    console.error('Error running ECS task:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    }
  }
}
