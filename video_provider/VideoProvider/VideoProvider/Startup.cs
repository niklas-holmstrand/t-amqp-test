using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GraphQL;
using GraphQL.Server;
using GraphQL.Server.Ui.Playground;
using GraphQL.Types;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VideoProvider.GraphQL;
using VideoProvider.GraphQL.GraphTypes;
using VideoProvider.GraphQL.Queries;
using VideoProvider.GraphQL.Schema;
using VideoProvider.GraphQL.Subscriptions;
using VideoProvider.Repository;
using VideoProvider.Utils;

namespace VideoProvider
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options => options.AddPolicy("CorsPolicy", builder =>
            {
                builder
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowAnyOrigin();
            }));

            services.AddControllers();
            services.AddSingleton<IDependencyResolver>(s => new FuncDependencyResolver(s.GetRequiredService));
            services.AddSingleton<CameraOperationsSubPush>();
            services.AddTransient<ICameraImageRepository, CameraImageRepository>();
            services.AddSingleton<ISchema, CameraImageSchema>();
            services.AddSingleton<CameraOperationsQuery>();
            services.AddSingleton<CameraOperationsSubscription>();
            services.AddSingleton<CameraImageType>();
            services.AddSingleton<CameraMoveAckType>();

            services.AddSingleton<CameraViewport>();

            services.AddGraphQL()
                .AddWebSockets()
                .AddDataLoader();
            services.Configure<IISServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            app.UseCors("CorsPolicy");
            app.UseWebSockets();
            app.UseGraphQLWebSockets<ISchema>("/graphql");
            app.UseGraphQL<ISchema>("/graphql");
            app.UseGraphQLPlayground(new GraphQLPlaygroundOptions
            {
                Path = "/ui/playground"
            });
        }
    }
}
