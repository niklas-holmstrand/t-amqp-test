using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using OpenCvSharp;
using OpenCvSharp.Extensions;

namespace VideoProvider.Utils
{
    public static class ImageStitcher
    {
        public static readonly string DestinationImagesFolder = "C:\\work\\p4\\tpsys_tpcp_simulator\\video_provider\\VideoProvider\\VideoProvider\\img\\outputs";

        public static Bitmap StitchImagesHorizontally(Bitmap first, Bitmap second, string outputFileName)
        {
            var mats = new List<Mat> { first.ToMat(), second.ToMat() };
            var pano = new Mat();


            var stitcher = Stitcher.Create();
            stitcher.RegistrationResol = 0.1;
            stitcher.WaveCorrection = false;


            stitcher.Stitch(mats, pano);


        //    SaveImage(outputFileName, pano);
            return pano.ToBitmap();
        }

        public static void SaveImage(string dst, Mat pano)
        {
            Cv2.ImWrite(Path.Combine(DestinationImagesFolder, dst), pano);
        }
    }
}
