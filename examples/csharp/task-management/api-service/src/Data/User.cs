using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace TaskManagementApi.Data;

/// <summary>
/// User entity for authentication and task ownership.
/// </summary>
[Table("users")]
[Index(nameof(Email), IsUnique = true)]
[Index(nameof(Username), IsUnique = true)]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("email")]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Column("username")]
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [Column("hashed_password")]
    public string HashedPassword { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
