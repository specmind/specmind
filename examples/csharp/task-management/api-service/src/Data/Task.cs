using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace TaskManagementApi.Data;

/// <summary>
/// Task entity for managing user tasks.
/// </summary>
[Table("tasks")]
[Index(nameof(UserId))]
public class Task
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("title")]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    [StringLength(1000)]
    public string? Description { get; set; }

    [Column("completed")]
    public bool Completed { get; set; } = false;

    [Column("priority")]
    [StringLength(20)]
    public string Priority { get; set; } = "medium";

    [Required]
    [Column("user_id")]
    [ForeignKey(nameof(Owner))]
    public int UserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public virtual User Owner { get; set; } = null!;
}
