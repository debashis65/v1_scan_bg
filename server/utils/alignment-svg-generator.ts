/**
 * Generates an SVG representation of leg alignment based on measurement data
 * 
 * @param measurements The advanced measurements data from scan results
 * @returns SVG markup as a string that can be embedded in HTML
 */
export function generateAlignmentSvg(measurements: any): string {
  // Default measurements if data is incomplete
  const alignment = measurements?.leg_alignment?.value || 'neutral';
  const qAngle = measurements?.q_angle?.value || { left: 14, right: 14 };
  const rightVarus = alignment === 'varus' ? true : false;
  const rightValgus = alignment === 'valgus' ? true : false;
  const leftVarus = alignment === 'varus' ? true : false;
  const leftValgus = alignment === 'valgus' ? true : false;
  
  // Calculate alignments and angles
  const leftAngle = leftValgus ? 15 : (leftVarus ? -15 : 0);
  const rightAngle = rightValgus ? 15 : (rightVarus ? -15 : 0);
  
  // Create SVG
  return `
    <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="400" height="300" fill="white" />
      
      <!-- Left Leg -->
      <g transform="translate(120, 20)">
        <!-- Thigh -->
        <path d="M30,0 L30,100 Q30,110 ${30 + leftAngle/2},120 L${30 + leftAngle},170" 
              stroke="#333" stroke-width="2" stroke-dasharray="5,5" fill="none" />
        
        <!-- Calf -->
        <path d="M${30 + leftAngle},170 Q${30 + leftAngle*1.2},220 ${30 + leftAngle*1.5},260" 
              stroke="#333" stroke-width="2" stroke-dasharray="5,5" fill="none" />
              
        <!-- Foot -->
        <path d="M${30 + leftAngle*1.5},260 L${30 + leftAngle*1.5 - 10},260 L${30 + leftAngle*1.5 - 30},270" 
              stroke="#333" stroke-width="2" fill="none" />
              
        <!-- Leg shading -->
        <path d="M15,0 C15,0 0,70 0,140 C0,210 5,250 ${30 + leftAngle*1.5 - 15},265 L${30 + leftAngle*1.5},260 
                C${30 + leftAngle*1.2},220 ${30 + leftAngle},170 Q30,110 30,100 L30,0 Z" 
              fill="#FFCFBF" stroke="none" opacity="0.7" />
              
        <!-- Knee joint -->
        <circle cx="${30 + leftAngle/2}" cy="120" r="5" fill="#333" />
        
        <!-- Q-angle indicator -->
        <line x1="${30 + leftAngle/2}" y1="120" x2="${30 + leftAngle/2 + 40}" y2="120" 
              stroke="#E91E63" stroke-width="3" />
        <text x="${30 + leftAngle/2 + 45}" y="125" font-family="Arial" font-size="12">${qAngle.left}°</text>
      </g>
      
      <!-- Right Leg -->
      <g transform="translate(220, 20)">
        <!-- Thigh -->
        <path d="M30,0 L30,100 Q30,110 ${30 + rightAngle/2},120 L${30 + rightAngle},170" 
              stroke="#333" stroke-width="2" stroke-dasharray="5,5" fill="none" />
        
        <!-- Calf -->
        <path d="M${30 + rightAngle},170 Q${30 + rightAngle*1.2},220 ${30 + rightAngle*1.5},260" 
              stroke="#333" stroke-width="2" stroke-dasharray="5,5" fill="none" />
              
        <!-- Foot -->
        <path d="M${30 + rightAngle*1.5},260 L${30 + rightAngle*1.5 + 10},260 L${30 + rightAngle*1.5 + 30},270" 
              stroke="#333" stroke-width="2" fill="none" />
              
        <!-- Leg shading -->
        <path d="M45,0 C45,0 60,70 60,140 C60,210 55,250 ${30 + rightAngle*1.5 + 15},265 L${30 + rightAngle*1.5},260 
                C${30 + rightAngle*1.2},220 ${30 + rightAngle},170 Q30,110 30,100 L30,0 Z" 
              fill="#FFCFBF" stroke="none" opacity="0.7" />
              
        <!-- Knee joint -->
        <circle cx="${30 + rightAngle/2}" cy="120" r="5" fill="#333" />
        
        <!-- Q-angle indicator -->
        <line x1="${30 + rightAngle/2}" y1="120" x2="${30 + rightAngle/2 - 40}" y2="120" 
              stroke="#E91E63" stroke-width="3" />
        <text x="${30 + rightAngle/2 - 55}" y="125" font-family="Arial" font-size="12">${qAngle.right}°</text>
      </g>
      
      <!-- Floor indicators -->
      <line x1="80" y1="280" x2="150" y2="280" stroke="#E91E63" stroke-width="3" />
      <line x1="250" y1="280" x2="320" y2="280" stroke="#E91E63" stroke-width="3" />
      
      <!-- Labels -->
      <text x="200" y="295" font-family="Arial" font-size="12" text-anchor="middle">
        ${alignment.charAt(0).toUpperCase() + alignment.slice(1)} Alignment
      </text>
    </svg>
  `;
}

/**
 * Generates an SVG representation of foot arch types
 * 
 * @param archType The detected arch type from the analysis
 * @returns SVG markup as a string that can be embedded in HTML
 */
export function generateArchTypeSvg(archType: string): string {
  // Define parameters based on arch type
  let archHeight = 10; // Default - normal arch
  let archColor = "#FFC107";
  
  if (archType === "flat_foot" || archType === "low_arch") {
    archHeight = 5;
    archColor = "#FF5722";
  } else if (archType === "high_arch" || archType === "cavus_foot") {
    archHeight = 18;
    archColor = "#2196F3";
  }
  
  return `
    <svg width="300" height="150" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="300" height="150" fill="white" />
      
      <!-- Foot outline -->
      <path d="M50,30 
              C80,25 120,20 150,50 
              C170,70 220,90 240,110 
              C245,120 240,130 230,130 
              C170,130 100,130 70,130 
              C50,130 40,115 50,100 
              C60,85 65,65 60,50 
              C55,35 40,32 50,30 Z" 
            fill="#FFCFBF" stroke="#333" stroke-width="1.5" />
            
      <!-- Arch indicator -->
      <path d="M70,130 
              C90,${130-archHeight*2} 150,${130-archHeight*3} 180,130" 
            fill="none" stroke="${archColor}" stroke-width="3" />
            
      <!-- Middle line -->
      <line x1="150" y1="30" x2="150" y2="130" stroke="#333" stroke-width="1" stroke-dasharray="3,3" />
      
      <!-- Label -->
      <text x="150" y="145" font-family="Arial" font-size="12" text-anchor="middle">
        ${archType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </text>
    </svg>
  `;
}