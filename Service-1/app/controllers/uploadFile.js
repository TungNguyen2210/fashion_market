const uploadFileController = {

    uploadFile: async (req, res) => {
        try {
            const imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;

            // Trả về đường dẫn ảnh (image_url) sau khi upload thành công
            res.json({ image_url: imageUrl });
          } catch (error) {
            console.log(error);
            res.status(500).send(error.message);
          }
    },
}

module.exports = uploadFileController;