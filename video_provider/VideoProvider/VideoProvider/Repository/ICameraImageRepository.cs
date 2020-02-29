using System;
using System.Collections.Generic;
using System.Text;
using VideoProvider.Models;

namespace VideoProvider.Repository
{
    public interface ICameraImageRepository
    {
        List<CameraImage> GetAll();
    }
}
