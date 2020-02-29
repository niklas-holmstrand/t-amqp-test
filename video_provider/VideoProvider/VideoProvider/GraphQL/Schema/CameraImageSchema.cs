using GraphQL;
using VideoProvider.GraphQL.Queries;
using VideoProvider.GraphQL.Subscriptions;

namespace VideoProvider.GraphQL.Schema
{
    public class CameraImageSchema : global::GraphQL.Types.Schema
    {
        public CameraImageSchema(IDependencyResolver resolver)
            : base(resolver)
        {
            Query = resolver.Resolve<CameraOperationsQuery>();
            Subscription = resolver.Resolve<CameraOperationsSubscription>();
        }
    }
}
