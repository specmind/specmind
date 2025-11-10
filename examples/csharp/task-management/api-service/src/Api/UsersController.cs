using Microsoft.AspNetCore.Mvc;
using TaskManagementApi.Data;

namespace TaskManagementApi.Api;

/// <summary>
/// API controller for user operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AppDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get user by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        _logger.LogInformation("Getting user {UserId}", id);
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(user);
    }

    /// <summary>
    /// Create a new user.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<User>> CreateUser([FromBody] User user)
    {
        _logger.LogInformation("Creating user {Username}", user.Username);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }
}
