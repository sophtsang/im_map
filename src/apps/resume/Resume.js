import { useState, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Resume() {
    const [numPages, setNumPages] = useState(null);
    const [width, setWidth] = useState(null);
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            // floor: fractional widths can make the scrollbar flicker on and off
            setWidth(Math.floor(entry.contentRect.width));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        // TODO: draw a representation of where this terminal is on the entire BSP
        <div className="pdf-window" ref={containerRef} style={{padding: 5}}>
            <Document 
                file={process.env.PUBLIC_URL + "/assets/resume.pdf"} 
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
                {width && Array.from(new Array(numPages), (el, index) => (
                    <Page 
                        key={index} pageNumber={index + 1} 
                        width={width}
                    />
                ))}
            </Document>
        </div>
    );
}
