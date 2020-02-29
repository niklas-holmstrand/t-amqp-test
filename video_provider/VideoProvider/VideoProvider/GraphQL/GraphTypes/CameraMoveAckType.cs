using GraphQL.Types;
using VideoProvider.Models;

namespace VideoProvider.GraphQL.GraphTypes
{
    public class CameraMoveAckType : ObjectGraphType<CameraMoveAck>
    {
        public CameraMoveAckType()
        {
            Field(x => x.X);
            Field(x => x.ZoomOut);
        }
    }
}
