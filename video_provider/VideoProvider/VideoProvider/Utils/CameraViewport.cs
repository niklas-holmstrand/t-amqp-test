using System;
using System.ComponentModel;
using System.Diagnostics.CodeAnalysis;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using VideoProvider.GraphQL.Subscriptions;
using VideoProvider.Models;

namespace VideoProvider.Utils
{
    [SuppressMessage("ReSharper", "StringLiteralTypo")]
    public class CameraViewport
    {
        private const string DestinationImagesPath = "C:\\work\\p4\\tpsys_tpcp_simulator\\video_provider\\VideoProvider\\VideoProvider\\img\\outputs\\currentImage.bmp";
        private const string DestinationImagesFolder = "C:\\work\\p4\\tpsys_tpcp_simulator\\video_provider\\VideoProvider\\VideoProvider\\img\\outputs\\";
        private const int ReferenceLeft = 1150;
        private const int ReferenceZoomOut = 1;
        private const int ReferenceImageWidth = 400;
        private const int ReferenceImageHeight = 400;
        private const int ZoomLevel1ScaledHeight = 266;
        private const int ZoomLevel1ScaledWidth = 850;
        // private readonly CameraOperationsSubPush _cameraOperationsSubPush;
        private Bitmap _refImg;
        private Bitmap currentBitmap;
        private int xGl = 800;
        private int nxGl = 800;
        private string lastImg;
        private int leftCatch;
        private int rightCatch;
        public int CurrentLeft { get; private set; }
        public int CurrentZoomOut { get; private set; }

        public CameraViewport()
        {
            CurrentLeft = ReferenceLeft;
            CurrentZoomOut = ReferenceZoomOut;
          //  _cameraOperationsSubPush = cameraOperationsSubPush;

          _refImg = LoadReferenceImage();
          lastImg = "";
          leftCatch = ReferenceLeft;
          rightCatch = ReferenceLeft + ReferenceImageWidth;


          // StartSendingCameraImages(1000);
        }

        public CameraMoveAck MoveCam(int x, int zoomOut)
        {
            var zoomOutChange = CurrentZoomOut != zoomOut;
            //CurrentLeft = x;
            CurrentZoomOut = zoomOut;
            nxGl = x;
            if (zoomOutChange)
            {
                GenerateCameraImage();
            }
            return new CameraMoveAck
            {
                X = x,
                ZoomOut = CurrentZoomOut
            };
        }

        public string GetImageFromCamera()
        {
            const int step = 4;

            if ((nxGl - CurrentLeft) < -step)
            {
                CurrentLeft -= step;
                return GenerateCameraImage();
            }
            else
            {
                if ((nxGl - CurrentLeft) > step)
                {
                    CurrentLeft += step;
                    return GenerateCameraImage();

                }
                if (lastImg != "")
                {
                    return lastImg;
                }
            }

            return GenerateCameraImage();

        }

        private string GenerateCameraImage()
        {
            using var ms = new MemoryStream();

            if (CurrentZoomOut == 2)
            {
                using var croppedImage = CropImage(_refImg, CurrentLeft, 0, ReferenceImageWidth, ReferenceImageHeight);
                using var toStitch = CropImage(_refImg, CurrentLeft + 200, 0, ReferenceImageWidth, ReferenceImageHeight);
                currentBitmap = croppedImage;

                using var stitched = ImageStitcher.StitchImagesHorizontally(croppedImage, toStitch, "stitched.jpg");
            //    SaveImage(stitched, "stitchedCurrent.bmp");

                var ratio = stitched.Height / (float)stitched.Width;
                var widthResize = ZoomLevel1ScaledHeight / ratio;
                using var resized = new Bitmap(stitched, new Size((int)Math.Ceiling(widthResize), ZoomLevel1ScaledHeight));
           //     SaveImage(resized, "resizedStitched.bmp");


                croppedImage.Dispose();

                // currentBitmap = stitched;

                resized.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                return imgSerialized;
            }
            else
            {
                using var croppedImage = CropImage(_refImg, CurrentLeft, 0, ReferenceImageWidth, ReferenceImageHeight);
                currentBitmap = croppedImage;

                croppedImage.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                SaveCurrentImage(croppedImage);
                return imgSerialized;
            }

        }

        private string GenerateCameraImageExtendedRight()
        {
            using var ms = new MemoryStream();

            if (CurrentZoomOut == 1)
            {
                using var croppedImage = CropImage(_refImg, ReferenceLeft, 0, Math.Min(1820, CurrentLeft + 300), ReferenceImageHeight);

                var ratio = croppedImage.Height / (float)croppedImage.Width;
                var widthResize = ZoomLevel1ScaledHeight / ratio;
                using var resized = new Bitmap(croppedImage, new Size((int)Math.Ceiling(widthResize), ZoomLevel1ScaledHeight));

                resized.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                SaveCurrentImage(croppedImage);
                rightCatch = Math.Min(1820, CurrentLeft + 300);
                CurrentLeft = nxGl;
                return imgSerialized;
            }
            else
            {
                using var croppedImage = CropImage(_refImg, ReferenceLeft, 0, Math.Min(1820, CurrentLeft + 300), ReferenceImageHeight);

                croppedImage.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                SaveCurrentImage(croppedImage);
                rightCatch = Math.Min(1820, CurrentLeft + 300);
                CurrentLeft = nxGl;
                return imgSerialized;
            }
        }

        private string GenerateCameraImageExtendedLeft()
        {
            CurrentLeft = nxGl;

            // using var img = LoadReferenceImage();
            using var ms = new MemoryStream();
            // using var croppedImage = CropImage(_refImg, CurrentLeft, 0, 500, 500);
            using var croppedImage2 = CropImage(_refImg, Math.Max(0, CurrentLeft - 300), 0, (rightCatch), 500);

            croppedImage2.Save(ms, ImageFormat.Jpeg);
            //    croppedImage.Save(ms, ImageFormat.Jpeg);
            var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
            lastImg = imgSerialized;
            leftCatch = Math.Max(0, CurrentLeft - 300);
            //SaveCurrentImage(stitched);

            return imgSerialized;
        }

        private string GenerateInitialCameraImage()
        {
            using var ms = new MemoryStream();

            if (CurrentZoomOut == 1)
            {
                using var croppedImage = CropImage(_refImg, CurrentLeft, 0, ZoomLevel1ScaledWidth, 400);
                currentBitmap = croppedImage;
                var ratio = croppedImage.Height / (float)croppedImage.Width;
                var widthResize = ZoomLevel1ScaledHeight / ratio;
                using var resized = new Bitmap(croppedImage, new Size((int)Math.Ceiling(widthResize), ZoomLevel1ScaledHeight));

                resized.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                SaveCurrentImage(resized);
                return imgSerialized;
            }
            else
            {
                using var croppedImage = CropImage(_refImg, CurrentLeft, 0, ReferenceImageWidth, ReferenceImageHeight);
                currentBitmap = croppedImage;

                croppedImage.Save(ms, ImageFormat.Jpeg);
                var imgSerialized = $"data:image/jpg;base64,{Convert.ToBase64String(ms.GetBuffer())}";
                lastImg = imgSerialized;
                SaveCurrentImage(croppedImage);
                return imgSerialized;
            }
        }

        private static Bitmap ResizeImage(Bitmap img, Size size)
        {
            return new Bitmap(img, size);
        }


        private static Bitmap LoadReferenceImage()
        {
            return new Bitmap("C:\\work\\p4\\tpsys_tpcp_simulator\\video_provider\\VideoProvider\\VideoProvider\\img\\reference_large.jpg");
        }

        private static Bitmap CropImage(Bitmap img, int cropX, int cropY, int cropWidth, int cropHeight)
        {
            var cropArea = new Rectangle(cropX, cropY, cropWidth, cropHeight);
            var cropped = img.Clone(cropArea, img.PixelFormat);
            return cropped;
        }

        private static void SaveCurrentImage(Bitmap img)
        {
            img.Save(DestinationImagesPath, ImageFormat.Bmp);
        }

        private static Bitmap LoadCurrentImage()
        {
            return new Bitmap(DestinationImagesPath);
        }

        private static void SaveImage(Bitmap img, string fileName)
        {
            img.Save(Path.Combine(DestinationImagesFolder, fileName), ImageFormat.Bmp);
        }

        //private void StartSendingCameraImages(int msInterval)
        //{
        //    var timer = new System.Threading.Timer(
        //        e => _cameraOperationsSubPush.PushCameraImage(new CameraImage { ImgSerialized = GetImageFromCamera(), X = CurrentLeft, Y = 750 }),
        //        null,
        //        TimeSpan.Zero,
        //        TimeSpan.FromMilliseconds(msInterval));
        //}
    }
}
