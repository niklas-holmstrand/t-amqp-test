using GraphQL.Types;
using VideoProvider.Models;

namespace VideoProvider.GraphQL.GraphTypes
{
    public class CameraImageType : ObjectGraphType<CameraImage>
    {
        public CameraImageType()
        {
            Field(ci => ci.ImgSerialized);
            Field(ci => ci.X);
            Field(ci => ci.Y);
        }
    }
}
