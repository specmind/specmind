using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TaskManagementApi.External;

/// <summary>
/// Client for sending emails via external service.
/// </summary>
public class EmailClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailClient> _logger;
    private readonly string _apiKey;

    public EmailClient(HttpClient httpClient, ILogger<EmailClient> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["EmailService:ApiKey"] ?? string.Empty;
    }

    public async Task<bool> SendTaskNotificationAsync(string email, string taskTitle)
    {
        _logger.LogInformation("Sending task notification to {Email}", email);

        var payload = new
        {
            to = email,
            subject = "Task Update",
            body = $"Task '{taskTitle}' has been updated"
        };

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        content.Headers.Add("X-API-Key", _apiKey);

        try
        {
            var response = await _httpClient.PostAsync("/api/send", content);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to send email notification");
            return false;
        }
    }

    public async Task<bool> SendWelcomeEmailAsync(string email, string username)
    {
        _logger.LogInformation("Sending welcome email to {Email}", email);

        var payload = new
        {
            to = email,
            subject = "Welcome to Task Manager",
            body = $"Hello {username}, welcome to our task management system!"
        };

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        content.Headers.Add("X-API-Key", _apiKey);

        try
        {
            var response = await _httpClient.PostAsync("/api/send", content);
            return response.IsSuccessStatusCode;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to send welcome email");
            return false;
        }
    }
}
