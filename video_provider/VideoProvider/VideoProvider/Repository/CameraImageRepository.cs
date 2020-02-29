using System;
using System.Collections.Generic;
using System.Text;
using VideoProvider.Models;

namespace VideoProvider.Repository
{
    public class CameraImageRepository : ICameraImageRepository
    {
        private List<CameraImage> images = new List<CameraImage>
        {
            new CameraImage
            {
                ImgSerialized = "base64/img1",
                X = 150,
                Y = 150
            }
        };

        public List<CameraImage> GetAll() => images;
    }
}
