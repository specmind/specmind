using System.Collections.Generic;
using System.Threading.Tasks;

namespace TaskManagementApi.Data;

/// <summary>
/// Generic repository interface for data access.
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task<T?> UpdateAsync(T entity);
    Task<bool> DeleteAsync(int id);
}
