using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskManagementApi.Data;

namespace TaskManagementApi.Service;

/// <summary>
/// Service for task business logic.
/// </summary>
public class TaskService
{
    private readonly TaskRepository _repository;

    public TaskService(TaskRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<TaskDto>> GetTasksByUserAsync(int userId, int skip = 0, int limit = 100)
    {
        var tasks = await _repository.GetByUserIdAsync(userId, skip, limit);
        return tasks.Select(MapToDto);
    }

    public async Task<TaskDto?> GetTaskByIdAsync(int id)
    {
        var task = await _repository.GetByIdAsync(id);
        return task == null ? null : MapToDto(task);
    }

    public async Task<TaskDto> CreateTaskAsync(TaskCreateDto createDto, int userId)
    {
        var task = new Data.Task
        {
            Title = createDto.Title,
            Description = createDto.Description,
            Priority = createDto.Priority,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _repository.AddAsync(task);
        return MapToDto(created);
    }

    public async Task<TaskDto?> UpdateTaskAsync(int id, TaskUpdateDto updateDto)
    {
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return null;

        if (updateDto.Title != null) existing.Title = updateDto.Title;
        if (updateDto.Description != null) existing.Description = updateDto.Description;
        if (updateDto.Completed.HasValue) existing.Completed = updateDto.Completed.Value;
        if (updateDto.Priority != null) existing.Priority = updateDto.Priority;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(existing);
        return updated == null ? null : MapToDto(updated);
    }

    public async Task<bool> DeleteTaskAsync(int id)
    {
        return await _repository.DeleteAsync(id);
    }

    private static TaskDto MapToDto(Data.Task task)
    {
        return new TaskDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            Completed = task.Completed,
            Priority = task.Priority,
            UserId = task.UserId,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}
