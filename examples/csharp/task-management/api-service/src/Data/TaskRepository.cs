using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace TaskManagementApi.Data;

/// <summary>
/// Repository for Task entity data access.
/// </summary>
public class TaskRepository : IRepository<Task>
{
    private readonly AppDbContext _context;

    public TaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Task?> GetByIdAsync(int id)
    {
        return await _context.Tasks
            .Include(t => t.Owner)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IEnumerable<Task>> GetAllAsync()
    {
        return await _context.Tasks
            .Include(t => t.Owner)
            .ToListAsync();
    }

    public async Task<IEnumerable<Task>> GetByUserIdAsync(int userId, int skip = 0, int limit = 100)
    {
        return await _context.Tasks
            .Where(t => t.UserId == userId)
            .Skip(skip)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Task> AddAsync(Task entity)
    {
        _context.Tasks.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Task?> UpdateAsync(Task entity)
    {
        var existing = await _context.Tasks.FindAsync(entity.Id);
        if (existing == null) return null;

        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null) return false;

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }
}
