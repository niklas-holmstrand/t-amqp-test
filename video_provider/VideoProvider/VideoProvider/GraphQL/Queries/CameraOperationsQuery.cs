using GraphQL.Types;
using VideoProvider.GraphQL.GraphTypes;
using VideoProvider.Utils;

namespace VideoProvider.GraphQL.Queries
{
    public class CameraOperationsQuery : ObjectGraphType
    {
        public CameraOperationsQuery(CameraViewport cameraViewport)
        {
            Field<CameraMoveAckType>("moveCam",
                arguments: new QueryArguments(new QueryArgument<IntGraphType> { Name = "x" }, new QueryArgument<IntGraphType> { Name = "zoomOut" }),
                resolve: context => cameraViewport.MoveCam(context.GetArgument<int>("x"), context.GetArgument<int>("zoomOut")));
        }

    }
}
