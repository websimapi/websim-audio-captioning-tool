export const config = {
    // User configurable settings
    defaultCaptionDuration: 5, // in seconds
    captionFontSize: '16px',
    captionColor: '#ffffff',
    captionBackgroundColor: 'rgba(0, 0, 0, 0.7)',
    exportFormat: 'srt', // srt, vtt, json, lrc
    
    // Game settings
    initialBallSize: 2,
    ballSpeed: 500, 
    humanCount: 15, 
    minHumanSize: 0.5,
    maxHumanSize: 2,
    
    // Performance settings
    renderDistance: 2, 
    maxPhysicsObjects: 50,
    
    // Predefined captions from the user input with word timings
    predefinedCaptions: [
        { 
            startTime: 0.373, 
            endTime: 6.390, 
            text: "Uwu, uwu, I'm falling for you",
            wordTimings: [{"time":0.43935},{"time":0.832803},{"time":3.299975},{"time":3.565534},{"time":3.771251},{"time":4.147037}]
        },
        { 
            startTime: 6.390, 
            endTime: 10.332, 
            text: "Every day my heart beats anew",
            wordTimings: [{"time":6.749647},{"time":7.19646},{"time":7.707106},{"time":7.958367},{"time":8.193416},{"time":8.819634}]
        },
        { 
            startTime: 10.332, 
            endTime: 14.527, 
            text: "Sparkles in my eyes when you're near",
            wordTimings: [{"time":10.815476},{"time":11.066226},{"time":11.266793},{"time":11.788082},{"time":12.029077},{"time":12.278136},{"time":13.935192}]
        },
        { 
            startTime: 14.527, 
            endTime: 17.172, 
            text: "In my kawaii world, you appear",
            wordTimings: [{"time":14.82628},{"time":15.047182},{"time":15.314228},{"time":15.508104},{"time":15.936149},{"time":16.122615}]
        },
        { 
            startTime: 17.172, 
            endTime: 25.021, 
            text: "Uwu, uwu, uwu (uwu)",
            wordTimings: [{"time":17.508796},{"time":18.856543},{"time":20.242741},{"time":20.621592}]
        },
        { 
            startTime: 25.021, 
            endTime: 33.350, 
            text: "Uwu, uwu, yeah (yeah)",
            wordTimings: [{"time":26.962445},{"time":28.411416},{"time":28.435504},{"time":28.481043}]
        },
        { 
            startTime: 33.350, 
            endTime: 36.918, 
            text: "Digital kisses through the screen",
            wordTimings: [{"time":33.410039},{"time":33.620243},{"time":34.598701},{"time":34.863842},{"time":35.102459}]
        },
        { 
            startTime: 36.918, 
            endTime: 41.319, 
            text: "Living in a pastel daydream",
            wordTimings: [{"time":36.94431},{"time":37.288841},{"time":37.691453},{"time":38.172936},{"time":38.614443}]
        },
        { 
            startTime: 41.319, 
            endTime: 45.155, 
            text: "Cute emojis tell our story",
            wordTimings: [{"time":41.803256},{"time":42.384756},{"time":42.893289},{"time":43.107115},{"time":43.536033}]
        },
        { 
            startTime: 45.155, 
            endTime: 50.458, 
            text: "Blushing pixels in all their glory",
            wordTimings: [{"time":45.360669},{"time":45.936194},{"time":46.504896},{"time":46.68246},{"time":47.088478},{"time":47.47984}]
        },
        { 
            startTime: 50.458, 
            endTime: 54.201, 
            text: "My heart goes doki-doki when",
            wordTimings: [{"time":51.200236},{"time":51.506801},{"time":51.722754},{"time":51.952337},{"time":52.194089}]
        },
        { 
            startTime: 54.201, 
            endTime: 58.458, 
            text: "You send those messages again",
            wordTimings: [{"time":54.476872},{"time":55.186918},{"time":55.483375},{"time":56.004766},{"time":56.496865}]
        },
        { 
            startTime: 58.458, 
            endTime: 62.474, 
            text: "I can't help but smile so wide",
            wordTimings: [{"time":58.670604},{"time":59.312305},{"time":59.555079},{"time":59.860564},{"time":60.121716},{"time":60.37342},{"time":60.78625}]
        },
        { 
            startTime: 62.474, 
            endTime: 65.405, 
            text: "These feelings I cannot hide",
            wordTimings: [{"time":62.678675},{"time":63.150137},{"time":63.672753},{"time":64.152916},{"time":64.639697}]
        },
        { 
            startTime: 65.405, 
            endTime: 71.528, 
            text: "Uwu, uwu, I'm falling for you",
            wordTimings: [{"time":65.852583},{"time":67.097252},{"time":68.265448},{"time":68.510303},{"time":68.938045},{"time":69.189634}]
        },
        { 
            startTime: 71.528, 
            endTime: 75.420, 
            text: "Every day my heart beats anew",
            wordTimings: [{"time":71.758313},{"time":72.261615},{"time":72.808126},{"time":73.031565},{"time":73.294501},{"time":73.882843}]
        },
        { 
            startTime: 75.420, 
            endTime: 79.787, 
            text: "Sparkles in my eyes when you're near",
            wordTimings: [{"time":75.656439},{"time":76.219701},{"time":76.40342},{"time":76.855919},{"time":77.092627},{"time":77.357841},{"time":77.700723}]
        },
        { 
            startTime: 79.787, 
            endTime: 82.087, 
            text: "In my kawaii world, you appear",
            wordTimings: [{"time":79.844071},{"time":80.082549},{"time":80.355919},{"time":80.917132},{"time":81.158344},{"time":81.386564}]
        },
        { 
            startTime: 82.087, 
            endTime: 90.070, 
            text: "Uwu, uwu, uwu (uwu)",
            wordTimings: [{"time":82.416743},{"time":83.324587},{"time":83.825397},{"time":83.875619}]
        },
        { 
            startTime: 90.070, 
            endTime: 95.108, 
            text: "Uwu, uwu, yeah (yeah)",
            wordTimings: [{"time":90.35145},{"time":91.914856},{"time":93.522572},{"time":93.746531}]
        }
    ]
};