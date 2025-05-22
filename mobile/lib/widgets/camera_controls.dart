import 'package:flutter/material.dart';

class CameraControls extends StatelessWidget {
  final Function() onCapture;
  final Function() onCancel;
  final bool isCapturing;
  final bool isReadyToCapture;
  final int capturedCount;
  final int totalCount;

  const CameraControls({
    Key? key,
    required this.onCapture,
    required this.onCancel,
    required this.isCapturing,
    required this.isReadyToCapture,
    required this.capturedCount,
    required this.totalCount,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Cancel button
          _buildCancelButton(),
          
          // Capture button
          _buildCaptureButton(),
          
          // Placeholder to balance the layout
          SizedBox(width: 60),
        ],
      ),
    );
  }

  Widget _buildCancelButton() {
    return GestureDetector(
      onTap: onCancel,
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.6),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Icon(
            Icons.close,
            color: Colors.white,
            size: 28,
          ),
        ),
      ),
    );
  }

  Widget _buildCaptureButton() {
    return GestureDetector(
      onTap: isReadyToCapture ? onCapture : null,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: isReadyToCapture
              ? Colors.white
              : Colors.white.withOpacity(0.5),
          shape: BoxShape.circle,
          border: Border.all(
            color: isReadyToCapture
                ? Colors.green
                : Colors.grey,
            width: 4,
          ),
          boxShadow: isReadyToCapture
              ? [
                  BoxShadow(
                    color: Colors.green.withOpacity(0.5),
                    blurRadius: 10,
                    spreadRadius: 3,
                  )
                ]
              : [],
        ),
        child: Center(
          child: AnimatedContainer(
            duration: Duration(milliseconds: 200),
            width: isCapturing ? 30 : 60,
            height: isCapturing ? 30 : 60,
            decoration: BoxDecoration(
              color: isReadyToCapture
                  ? Colors.green
                  : Colors.grey,
              shape: BoxShape.circle,
            ),
            child: isCapturing
                ? Center(
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 3,
                    ),
                  )
                : null,
          ),
        ),
      ),
    );
  }
}