import importlib.util
import contextlib
import io
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('optimizer', ROOT / 'scripts/optimize_images.py')
optimizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(optimizer)

class PhotoTests(unittest.TestCase):
    def test_resize_orientation_strip_and_preserve_source(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            original = base / 'original.jpg'
            exif = Image.Exif()
            exif[271] = 'Synthetic camera'
            exif[274] = 6
            Image.new('RGB', (2400, 1200), 'red').save(original, exif=exif)
            data = original.read_bytes()
            site = base / '_site'
            (site / 'images/gallery').mkdir(parents=True)
            photo = site / 'images/gallery/01.jpg'
            photo.write_bytes(data)
            (site / 'index.html').write_text('<script src="config.js"></script>')
            (site / 'config.js').write_text('window.WEDDING = {};')
            optimizer.main(str(site))
            with Image.open(photo) as result:
                self.assertEqual(result.size, (800, 1600))
                self.assertFalse(result.getexif())
            self.assertEqual(original.read_bytes(), data)
            self.assertTrue((site / '_thumbs/images/gallery/01.jpg').exists())
            self.assertIn('WEDDING_THUMBS', (site / 'index.html').read_text())

    def test_png_rename_updates_config_and_og(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / 'images').mkdir()
            Image.new('RGB', (2000, 1000), 'blue').save(site / 'images/cover.png')
            (site / 'config.js').write_text('window.WEDDING = {"cover":{"image":"images/cover.png"}};')
            (site / 'index.html').write_text('<meta property="og:image" content="https://example.com/images/cover.png">')
            optimizer.main(str(site))
            self.assertTrue((site / 'images/cover.jpg').exists())
            self.assertNotIn('cover.png', (site / 'config.js').read_text())
            self.assertIn('cover.jpg', (site / 'index.html').read_text())

    def test_corrupt_and_heic_stop_deployment(self):
        for name in ['cover.jpg', 'phone.heic']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                site = Path(directory)
                (site / 'images').mkdir()
                (site / 'images' / name).write_bytes(b'broken photo')
                with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as raised:
                    optimizer.main(str(site))
                self.assertEqual(raised.exception.code, 1)

    def test_small_xmp_jpeg_and_transparent_png_metadata_are_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            photo = Path(directory) / 'xmp.jpg'
            Image.new('RGB', (100, 100), 'blue').save(photo, xmp=b'<x:xmpmeta>private author</x:xmpmeta>')
            with Image.open(photo) as source:
                self.assertTrue(source.info.get('xmp'))
            result, changed = optimizer.optimize(str(photo))
            self.assertTrue(changed)
            with Image.open(result) as image:
                self.assertFalse(image.info.get('xmp'))
            photo = Path(directory) / 'transparent.png'
            exif = Image.Exif()
            exif[271] = 'Synthetic camera'
            Image.new('RGBA', (100, 100), (0, 0, 255, 128)).save(photo, exif=exif)
            result, changed = optimizer.optimize(str(photo))
            self.assertTrue(changed)
            with Image.open(result) as image:
                self.assertEqual(image.format, 'PNG')
                self.assertFalse(image.getexif())
                self.assertEqual(image.getpixel((0, 0))[3], 128)

if __name__ == '__main__':
    unittest.main()
