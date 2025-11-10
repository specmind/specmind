using System;
using System.ComponentModel.DataAnnotations;

namespace TaskManagementApi.Service;

/// <summary>
/// Data transfer object for Task responses.
/// </summary>
public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public string Priority { get; set; } = "medium";
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Data transfer object for creating a new task.
/// </summary>
public class TaskCreateDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(20)]
    public string Priority { get; set; } = "medium";
}

/// <summary>
/// Data transfer object for updating an existing task.
/// </summary>
public class TaskUpdateDto
{
    [StringLength(200)]
    public string? Title { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    public bool? Completed { get; set; }

    [StringLength(20)]
    public string? Priority { get; set; }
}
