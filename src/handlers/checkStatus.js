const { ECSClient, DescribeTasksCommand } = require('@aws-sdk/client-ecs')

const ecsClient = new ECSClient({ region: process.env.AWS_REGION })

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2))

  try {
    // Extract task ARN from path parameters
    const taskArn = event.pathParameters?.taskArn

    if (!taskArn) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Task ARN is required in the path parameter'
        })
      }
    }

    // Decode URL-encoded task ARN if needed
    const decodedTaskArn = decodeURIComponent(taskArn)

    console.log('Checking status for task:', decodedTaskArn)

    // Describe the ECS task
    const describeParams = {
      cluster: process.env.CLUSTER_NAME,
      tasks: [decodedTaskArn]
    }

    const command = new DescribeTasksCommand(describeParams)
    const response = await ecsClient.send(command)

    console.log('ECS describe response:', JSON.stringify(response, null, 2))

    if (!response.tasks || response.tasks.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Task not found',
          taskArn: decodedTaskArn
        })
      }
    }

    const task = response.tasks[0]

    // Extract relevant task information
    const taskInfo = {
      taskArn: task.taskArn,
      taskDefinitionArn: task.taskDefinitionArn,
      clusterArn: task.clusterArn,
      lastStatus: task.lastStatus,
      desiredStatus: task.desiredStatus,
      healthStatus: task.healthStatus,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      stoppedAt: task.stoppedAt,
      stoppedReason: task.stoppedReason,
      stopCode: task.stopCode,
      cpu: task.cpu,
      memory: task.memory,
      platformVersion: task.platformVersion,
      launchType: task.launchType
    }

    // Determine if task is completed
    const isCompleted = task.lastStatus === 'STOPPED'
    const isRunning = task.lastStatus === 'RUNNING'
    const isPending =
      task.lastStatus === 'PENDING' || task.lastStatus === 'PROVISIONING'

    // Extract container information
    const containers =
      task.containers?.map(container => ({
        name: container.name,
        lastStatus: container.lastStatus,
        exitCode: container.exitCode,
        reason: container.reason,
        healthStatus: container.healthStatus
      })) || []

    // Check if task completed successfully
    let taskStatus = 'UNKNOWN'
    let success = false

    if (isCompleted) {
      // Check if all containers exited with code 0
      const allContainersSuccessful = containers.every(
        container => container.exitCode === 0
      )

      if (allContainersSuccessful) {
        taskStatus = 'COMPLETED_SUCCESSFULLY'
        success = true
      } else {
        taskStatus = 'COMPLETED_WITH_ERRORS'
        success = false
      }
    } else if (isRunning) {
      taskStatus = 'RUNNING'
      success = true
    } else if (isPending) {
      taskStatus = 'PENDING'
      success = true
    } else {
      taskStatus = task.lastStatus || 'UNKNOWN'
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        taskStatus: taskStatus,
        isCompleted: isCompleted,
        isRunning: isRunning,
        isPending: isPending,
        taskInfo: taskInfo,
        containers: containers,
        message: `Task is ${taskStatus.toLowerCase().replace('_', ' ')}`
      })
    }
  } catch (error) {
    console.error('Error checking task status:', error)

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
