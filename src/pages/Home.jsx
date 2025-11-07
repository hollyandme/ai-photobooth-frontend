
import React, { useState, useRef } from 'react';
import { Camera, Download, Loader2, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

const ImageUploader = ({ image, setImage, isRed = false, style, className }) => {
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
        }
    };

    return (
        <div
            className={`w-36 h-36 md:w-40 md:h-40 border-2 border-solid cursor-pointer transition-all duration-300 hover:scale-105 ${
                isRed 
                    ? 'bg-[#C73E2E] border-[#C73E2E]' 
                    : 'bg-[#EFEFEF] border-[#C73E2E]'
            } ${className}`}
            style={style}
            onClick={() => inputRef.current.click()}
        >
            <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            {image ? (
                <img src={URL.createObjectURL(image)} alt="Uploaded selfie" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className={`text-5xl font-bold ${isRed ? 'text-white' : 'text-[#C73E2E]'}`}>+</div>
                </div>
            )}
        </div>
    );
};

export default function Home() {
    const [selfie1, setSelfie1] = useState(null);
    const [selfie2, setSelfie2] = useState(null);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Transform values for mobile elements - EXTREMELY DRAMATIC
    // These will now be used for both mobile and desktop
    const mobileStripRotate = useTransform(scrollYProgress, [0, 1], [-60, 90]);
    const instructionMobileRotate = useTransform(scrollYProgress, [0, 1], [50, -70]);
    const mobileSquare1Rotate = useTransform(scrollYProgress, [0, 1], [-90, 150]);
    const mobileSquare2Rotate = useTransform(scrollYProgress, [0, 1], [80, -120]);

    // IMPORTANT: Set your backend API URL here.
    // This is now pointing to your live Railway deployment.
    const API_BASE_URL = 'https://ai-photobooth-production.up.railway.app';

    const handleGenerate = async () => {
        if (!selfie1 || !selfie2) {
            setError("Please upload both selfies.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            console.log('Starting image upload...');
            // Step 1: Upload both images to your backend concurrently
            const uploadPromises = [selfie1, selfie2].map(file => {
                const formData = new FormData();
                formData.append('file', file);
                return fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });
            });

            const uploadResponses = await Promise.all(uploadPromises);

            for (const res of uploadResponses) {
                if (!res.ok) {
                    throw new Error(`Image upload failed: ${res.status} ${res.statusText}`);
                }
            }

            const [uploadData1, uploadData2] = await Promise.all(uploadResponses.map(res => res.json()));
            console.log('Upload responses:', uploadData1, uploadData2);

            let { file_url: imageUrl1 } = uploadData1;
            let { file_url: imageUrl2 } = uploadData2;

            if (!imageUrl1 || !imageUrl2) {
                throw new Error('An uploaded file URL was not returned from the server.');
            }

            // --- ENHANCED URL CORRECTION ---
            // This function replaces placeholder domains with the correct Railway URL
            const correctUrl = (url) => {
                console.log('Original URL:', url);

                if (url && (url.includes('https://your-api-domain.com') || url.includes('http://localhost') || url.includes('127.0.0.1'))) {
                    try {
                        const urlPath = new URL(url).pathname;
                        const correctedUrl = `${API_BASE_URL}${urlPath}`;
                        console.log(`Correcting URL from ${url} to ${correctedUrl}`);
                        return correctedUrl;
                    } catch (e) {
                        console.error('Error parsing URL for correction:', e);
                        return url;
                    }
                }
                return url;
            };

            imageUrl1 = correctUrl(imageUrl1);
            imageUrl2 = correctUrl(imageUrl2);

            console.log('Starting image generation with URLs:', imageUrl1, imageUrl2);
            // Step 2: Call the generation endpoint with the image URLs
            const generateResponse = await fetch(`${API_BASE_URL}/generate-photobooth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url_1: imageUrl1,
                    image_url_2: imageUrl2,
                }),
            });

            if (!generateResponse.ok) {
                const errorText = await generateResponse.text();
                console.error('Generation error response:', errorText);

                // Show more user-friendly error message
                if (generateResponse.status === 500) {
                    throw new Error('Server error: The AI generation service is currently unavailable. Please try again later.');
                } else {
                    throw new Error(`Image generation failed: ${generateResponse.status} ${generateResponse.statusText}`);
                }
            }

            const generateData = await generateResponse.json();
            console.log('Generation response:', generateData);

            // Get the generated image URL and apply correction
            let generatedImageUrl = generateData.generated_image_url || generateData.image_url || generateData.url || generateData.result;

            console.log('Raw generated image URL:', generatedImageUrl);
            generatedImageUrl = correctUrl(generatedImageUrl);
            console.log('Corrected generated image URL:', generatedImageUrl);

            if (!generatedImageUrl) {
                console.error('No image URL found in response:', generateData);
                throw new Error('Generated image URL not found in server response.');
            }

            console.log('Setting generated image URL:', generatedImageUrl);

            // Set the image directly - let the browser handle loading
            setGeneratedImage(generatedImageUrl);

        } catch (e) {
            console.error('Error in handleGenerate:', e);

            // Provide more specific error messages based on the error type
            if (e.message.includes('Failed to fetch') || e.name === 'TypeError') {
                setError('Cannot connect to the AI service. This might be a CORS issue. Please check the browser console for details.');
            } else {
                setError(e.message || "Something went wrong. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSelfie1(null);
        setSelfie2(null);
        setGeneratedImage(null);
        setError(null);
    }

    return (
        <div ref={containerRef} className="relative min-h-screen w-full bg-[#EFEFEF] flex flex-col items-center justify-start py-12 px-4 overflow-hidden">

            <AnimatePresence>
                {generatedImage ? (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="z-30 flex flex-col items-center justify-center w-full min-h-screen max-w-md mx-auto px-4"
                    >
                        {/* Title Image */}
                        <motion.div
                            className="relative flex justify-center mb-4"
                            initial={{ y: -30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <img
                                src="https://adrodev.de/pub/photobooth/photobooth_header.png"
                                alt="AI Photo Booth"
                                className="w-full h-auto select-none z-10 relative"
                                style={{ maxWidth: '14rem' }}
                            />
                        </motion.div>

                        {/* Header text */}
                        <motion.p
                            className="font-special-elite text-sm md:text-base text-[#C73E2E] tracking-[0.3em] max-w-xs mx-auto text-center"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            here is your photo, you look so cute together!
                        </motion.p>

                        {/* Photo strip container */}
                        <div className="relative mb-8 mt-4">
                            {/* Black border around photo */}
                            <div className="bg-black p-1 rounded-lg relative z-10">
                                {/* This div acts as the slot/mask with overflow hidden */}
                                <div className="overflow-hidden rounded-md">
                                    <motion.img
                                        src={generatedImage}
                                        alt="Generated photobooth"
                                        className="rounded-md max-w-xs md:max-w-sm w-full h-auto"
                                        initial={{ y: "-100%" }}
                                        animate={{ y: "0%" }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                                    />
                                </div>
                            </div>

                            {/* Download button - positioned on the right */}
                            <motion.a
                                href={generatedImage}
                                download="ai-photobooth.png"
                                className="absolute -right-10 md:-right-14 bottom-20 w-28 h-28 md:w-32 md:h-32 hover:scale-105 transition-transform z-20"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
                            >
                                <img src="https://adrodev.de/pub/photobooth/download.png" alt="Download Photo" className="w-full h-full object-contain"/>
                            </motion.a>

                            {/* Take new photo button - positioned on the left */}
                            <motion.button
                                onClick={handleReset}
                                className="absolute -left-10 md:-left-16 bottom-4 w-24 h-24 md:w-28 md:h-28 hover:scale-105 transition-transform z-20"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
                            >
                                <img src="https://adrodev.de/pub/photobooth/take.png" alt="Take a new photo" className="w-full h-full object-contain"/>
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <React.Fragment>
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative z-10 w-full mx-auto"
                        >
                            {/* Title and Photo Strip Container */}
                            <div className="relative flex justify-center mb-4">
                                {/* Custom Title Image */}
                                <img
                                    src="https://adrodev.de/pub/photobooth/photobooth_header.png"
                                    alt="AI Photo Booth"
                                    className="w-full h-auto select-none z-10 relative"
                                    style={{ maxWidth: '14rem' }}
                                />
                            </div>

                            {/* Subtitle */}
                            <div className="text-center mb-1 px-4">
                                <p className="font-special-elite text-sm md:text-base text-[#C73E2E] tracking-[0.3em] max-w-xs mx-auto">
                                    Create an AI photobooth experience with your friends
                                </p>
                            </div>
                        </motion.div>
                        <motion.div
                            key="uploaders"
                            className="w-full flex justify-center mt-0"
                        >
                            {/* Unified Layout for both Mobile and Desktop */}
                            <div className="flex flex-col items-center relative pt-8">
                                {/* Photo Strip for Mobile - positioned in background */}
                                <motion.img
                                    src="https://adrodev.de/pub/photobooth/stripe.png"
                                    alt="Sample photobooth strip"
                                    className="absolute z-0 w-24 md:w-32 h-auto select-none"
                                    style={{ right: '40px', top: '30px', rotate: mobileStripRotate }}
                                />

                                <motion.img
                                    src="https://adrodev.de/pub/photobooth/instructions.png"
                                    alt="Upload instructions"
                                    className="w-80 md:w-[30rem] h-auto select-none z-5 mb-2"
                                    style={{ rotate: instructionMobileRotate }}
                                />

                                <div className="relative w-64 md:w-96 h-36 md:h-48 z-10">
                                    <motion.div
                                        className="absolute w-28 h-28 md:w-auto md:h-auto"
                                        style={{ left: '0%', top: '-35px', rotate: mobileSquare1Rotate }}
                                    >
                                        <ImageUploader
                                            image={selfie1} setImage={setSelfie1} isRed={false}
                                            className="w-full h-full md:w-40 md:h-40"
                                        />
                                    </motion.div>
                                    <motion.div
                                        className="absolute w-28 h-28 md:w-auto md:h-auto"
                                        style={{ right: '0%', top: '-40px', rotate: mobileSquare2Rotate }}
                                    >
                                        <ImageUploader
                                            image={selfie2} setImage={setSelfie2} isRed={true}
                                            className="w-full h-full md:w-40 md:h-40"
                                        />
                                    </motion.div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={isLoading || !selfie1 || !selfie2}
                                    className="relative transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed bg-transparent border-none p-0 z-20 mt-[-3rem]"
                                >
                                    {isLoading ? (
                                        <div className="w-44 h-44 md:w-52 md:h-52 bg-[#C73E2E] rounded-full flex items-center justify-center">
                                            <Loader2 className="animate-spin w-10 h-10 md:w-12 md:h-12 text-white" />
                                        </div>
                                    ) : (
                                        <img
                                            src="https://adrodev.de/pub/photobooth/take_button.png"
                                            alt="Take Photo Button"
                                            className="w-44 h-44 md:w-52 md:h-52 object-contain"
                                        />
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </React.Fragment>
                )}
            </AnimatePresence>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-5 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
                    role="alert"
                >
                    <span className="block sm:inline">{error}</span>
                </motion.div>
            )}
        </div>
    );
}

