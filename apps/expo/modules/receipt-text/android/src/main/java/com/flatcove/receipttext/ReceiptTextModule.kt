package com.flatcove.receipttext

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReceiptTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptText")

    AsyncFunction("recognizeLines") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      val image = try {
        context?.let { InputImage.fromFilePath(it, Uri.parse(uri)) }
      } catch (error: Exception) {
        null
      }
      if (image == null) {
        promise.resolve(emptyList<Map<String, Any>>())
        return@AsyncFunction
      }
      // Boxes come in the upright image's pixels, which swaps width and height when rotated
      val upright = image.rotationDegrees % 180 == 0
      val width = (if (upright) image.width else image.height).toFloat()
      val height = (if (upright) image.height else image.width).toFloat()

      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        .process(image)
        .addOnSuccessListener { result ->
          promise.resolve(
            result.textBlocks.flatMap { it.lines }.mapNotNull { line ->
              val box = line.boundingBox ?: return@mapNotNull null
              mapOf(
                "text" to line.text,
                "x" to box.left / width,
                "y" to box.top / height,
                "width" to box.width() / width,
                "height" to box.height() / height,
              )
            },
          )
        }
        .addOnFailureListener { promise.resolve(emptyList<Map<String, Any>>()) }
    }
  }
}
