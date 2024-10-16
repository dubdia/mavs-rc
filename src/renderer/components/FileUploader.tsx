import { ChangeEvent, ReactElement, cloneElement, useRef } from "react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  children: ReactElement; 
}
export const FileUploader = (props: FileUploaderProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const handleButtonClick = () => {
    fileInput.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event?.target?.files;
    if (files == null || files.length !== 1) {
      return;
    }
    const file = files[0];
    if (file == null) {
      return;
    }
    if (props?.onFileSelect != null) {
      props.onFileSelect(file);
      event.target.value = '';
      event.target.type = ''
      event.target.type = 'file'
    }
  };

  return (
    <>
      <input type="file" ref={fileInput} style={{ display: "none" }} onChange={handleFileChange} />
      {cloneElement(props.children, {onClick: handleButtonClick})}
    </>
  );
};
