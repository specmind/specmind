using Microsoft.EntityFrameworkCore;
using TaskManagementApi.Data;
using TaskManagementApi.Service;
using TaskManagementApi.External;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
builder.Services.AddScoped<TaskRepository>();

// Services
builder.Services.AddScoped<TaskService>();

// External clients
builder.Services.AddHttpClient<EmailClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["EmailService:BaseUrl"] ?? "https://api.email-service.com");
});

builder.Services.AddHttpClient<NotificationQueue>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["NotificationQueue:Url"] ?? "https://queue.example.com");
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
