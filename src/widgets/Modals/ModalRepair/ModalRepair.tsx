import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';

interface ModalRepairProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const ModalRepair = ({ open, setOpen }: ModalRepairProps) => {
  const navigate = useNavigate();

  const hideModal = () => {
    setOpen(false);
  };

  const successModal = () => {
    navigate('/dashboard');
  };

  return (
    <Modal
      title={`Закрыть страницу?`}
      open={open}
      onOk={successModal}
      onCancel={hideModal}
      okText="Закрыть без сохранения"
      cancelText="Остаться"
    >
      <p>У вас есть несохранённые изменения. Если закрыть страницу, они будут потеряны.</p>
    </Modal>
  );
};
