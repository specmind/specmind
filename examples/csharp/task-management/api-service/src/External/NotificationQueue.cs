using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TaskManagementApi.External;

/// <summary>
/// Client for sending messages to notification queue.
/// </summary>
public class NotificationQueue
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<NotificationQueue> _logger;
    private readonly string _queueUrl;

    public NotificationQueue(HttpClient httpClient, ILogger<NotificationQueue> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _queueUrl = configuration["NotificationQueue:Url"] ?? string.Empty;
    }

    public async Task<bool> EnqueueTaskCreatedAsync(int taskId, int userId, string taskTitle)
    {
        _logger.LogInformation("Enqueueing task created notification for task {TaskId}", taskId);

        var message = new
        {
            eventType = "task.created",
            taskId,
            userId,
            taskTitle,
            timestamp = DateTime.UtcNow
        };

        return await SendMessageAsync(message);
    }

    public async Task<bool> EnqueueTaskCompletedAsync(int taskId, int userId)
    {
        _logger.LogInformation("Enqueueing task completed notification for task {TaskId}", taskId);

        var message = new
        {
            eventType = "task.completed",
            taskId,
            userId,
            timestamp = DateTime.UtcNow
        };

        return await SendMessageAsync(message);
    }

    private async Task<bool> SendMessageAsync(object message)
    {
        var content = new StringContent(
            JsonSerializer.Serialize(message),
            Encoding.UTF8,
            "application/json");

        try
        {
            var response = await _httpClient.PostAsync($"{_queueUrl}/messages", content);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to send message to notification queue");
            return false;
        }
    }
}
