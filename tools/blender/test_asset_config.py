"""Boundary tests for isolated generation, font selection and preview routing."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import asset_config as config
import make_raster_assets as raster


class AssetConfigTests(unittest.TestCase):
    def test_review_rejects_public_and_children(self):
        for path in [config.ROOT/'public', config.ROOT/'public/assets/review']:
            with self.assertRaisesRegex(ValueError, 'outside public'):
                config.review_path(path)
        self.assertEqual(config.review_path(config.DEFAULT_REVIEW), config.DEFAULT_REVIEW)
        self.assertNotIn(config.ROOT/'public', config.DEFAULT_OUTPUT.parents)

    def test_installed_font_requires_explicit_opt_in(self):
        with tempfile.TemporaryDirectory() as directory:
            font = Path(directory)/'NotoSerifCJK-Regular.ttc'
            font.write_bytes(b'font fixture')
            with self.assertRaisesRegex(ValueError, 'explicitly accepts a different font'):
                config.resolve_font(candidates=[font])
            self.assertEqual(config.resolve_font(allow_fallback=True, candidates=[font]), font)
            self.assertEqual(config.resolve_font(explicit=font), font)
            self.assertEqual(config.font_record(font)['collectionFace'], 0)

    def test_review_rejects_symlink_into_public(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'public').mkdir()
            try:
                (root/'review-link').symlink_to(root/'public', target_is_directory=True)
            except OSError:
                self.skipTest('Creating symlinks is unavailable on this platform')
            with patch.object(config, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'outside public'):
                    config.review_path(root/'review-link/assets')

    def test_missing_explicit_font_never_falls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'Configured font does not exist'):
                config.resolve_font(Path(directory)/'missing.ttf', allow_fallback=True)
            with self.assertRaisesRegex(ValueError, 'No installed Noto'):
                config.resolve_font(allow_fallback=True, candidates=[])

    def test_selected_previews_do_not_publish_or_require_font(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw, review, layers = root/'raw', root/'review', root/'assets/renders/p0'
            raw.mkdir()
            for name in ['prop-dice', 'word-critical', 'background-far']:
                Image.new('RGBA', (8, 8), (10, 20, 30, 100)).save(raw/f'{name}.png')
            with patch.multiple(raster, TMP=raw, REVIEW=review, REN=layers, FONT=None):
                raster.finish(['prop-dice'])
            self.assertEqual({p.name for p in review.iterdir()}, {'prop-dice.webp', 'contact-sheet.webp'})
            self.assertFalse(layers.exists())

    def test_only_three_background_layers_go_to_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw, review, layers = root/'raw', root/'review', root/'assets/renders/p0'
            raw.mkdir()
            for name in ['background-far', 'background-mid', 'background-near', 'background-other']:
                Image.new('RGBA', (8, 8), (10, 20, 30, 100)).save(raw/f'{name}.png')
            with patch.multiple(raster, TMP=raw, REVIEW=review, REN=layers, FONT=None):
                raster.finish()
            self.assertEqual({p.name for p in layers.iterdir()},
                             {f'background-{name}.webp' for name in ['far', 'mid', 'near']})
            self.assertTrue((review/'background-composite.webp').is_file())
            self.assertTrue((review/'background-other.webp').is_file())
            with Image.open(layers/'background-mid.webp') as image:
                self.assertEqual(image.getpixel((0, 0))[3], 100)

    def test_empty_finish_is_valid(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.multiple(raster, TMP=root/'raw', REVIEW=root/'review', REN=root/'layers'):
                raster.finish()
            self.assertEqual(list((root/'review').iterdir()), [])


if __name__ == '__main__':
    unittest.main()
