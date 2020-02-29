using System;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Threading.Tasks;
using GraphQL.Resolvers;
using GraphQL.Subscription;
using GraphQL.Types;
using VideoProvider.GraphQL.GraphTypes;
using VideoProvider.Models;
using VideoProvider.Utils;

namespace VideoProvider.GraphQL.Subscriptions
{
    public class CameraOperationsSubscription : ObjectGraphType
    {
        private readonly CameraOperationsSubPush _cameraOperationsSubPush;
        public CameraOperationsSubscription(CameraOperationsSubPush cameraOperationsSubPush)
        {
            _cameraOperationsSubPush = cameraOperationsSubPush;
            AddField(new EventStreamFieldType
            {
                Name = "newCameraImage",
                Type = typeof(CameraImageType),


                Resolver = new FuncFieldResolver<CameraImage>(ResolveCameraImage),
                Subscriber = new EventStreamResolver<CameraImage>(Subscribe)
            });
        }

        private CameraImage ResolveCameraImage(ResolveFieldContext context)
        {
            var cameraImage = context.Source as CameraImage;
            return cameraImage;
        }

        private IObservable<CameraImage> Subscribe(ResolveEventStreamContext context)
        {
            return _cameraOperationsSubPush.CameraImages();
        }
    }

    public class CameraOperationsSubPush
    {
        private readonly ISubject<CameraImage> cameraImageStream = new ReplaySubject<CameraImage>(1);
        private readonly CameraViewport _cwph;


        public CameraOperationsSubPush(CameraViewport cwp)
        {
            _cwph = cwp;
        }

        public void PushCameraImage(CameraImage cameraImage)
        {
            cameraImageStream.OnNext(cameraImage);
        }

        public IObservable<CameraImage> CameraImages()
        {
            var fps30 = 33;
            var fpsCustom = 3000;
            return Observable.Interval(TimeSpan.FromMilliseconds(fps30))
                .Select(s =>
                {
                    var imgSerialized = _cwph.GetImageFromCamera();
                    if (imgSerialized != "")
                    {
                        return new CameraImage
                            { ImgSerialized = imgSerialized, X = _cwph.CurrentLeft, Y = 0 };
                    }

                    return null;
                });
            //return cameraImageStream.AsObservable();
        }
    }
}
