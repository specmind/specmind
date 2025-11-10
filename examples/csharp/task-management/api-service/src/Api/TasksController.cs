using Microsoft.AspNetCore.Mvc;
using TaskManagementApi.Service;

namespace TaskManagementApi.Api;

/// <summary>
/// API controller for task operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(TaskService taskService, ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    /// <summary>
    /// Get all tasks for a user.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks(
        [FromQuery] int userId,
        [FromQuery] int skip = 0,
        [FromQuery] int limit = 100)
    {
        _logger.LogInformation("Getting tasks for user {UserId}", userId);
        var tasks = await _taskService.GetTasksByUserAsync(userId, skip, limit);
        return Ok(tasks);
    }

    /// <summary>
    /// Get a task by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        _logger.LogInformation("Getting task {TaskId}", id);
        var task = await _taskService.GetTaskByIdAsync(id);

        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        return Ok(task);
    }

    /// <summary>
    /// Create a new task.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(
        [FromBody] TaskCreateDto createDto,
        [FromQuery] int userId)
    {
        _logger.LogInformation("Creating task for user {UserId}", userId);
        var task = await _taskService.CreateTaskAsync(createDto, userId);
        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
    }

    /// <summary>
    /// Update an existing task.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(
        int id,
        [FromBody] TaskUpdateDto updateDto)
    {
        _logger.LogInformation("Updating task {TaskId}", id);
        var task = await _taskService.UpdateTaskAsync(id, updateDto);

        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        return Ok(task);
    }

    /// <summary>
    /// Delete a task.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        _logger.LogInformation("Deleting task {TaskId}", id);
        var success = await _taskService.DeleteTaskAsync(id);

        if (!success)
        {
            return NotFound(new { message = "Task not found" });
        }

        return NoContent();
    }
}
